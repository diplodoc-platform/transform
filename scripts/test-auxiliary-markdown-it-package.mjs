import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

import {verifyMarkdownItStartupPackage} from './test-markdown-it-startup.mjs';

/**
 * Exercise shipped auxiliary parsers while refusing the unoptimized registry parser.
 * @param {string} packageRoot - Installed package directory.
 * @param {string} consumerRoot - Temporary consumer directory for real collector files.
 * @returns {Promise<object>} The checked public module and parsing counts.
 */
export async function verifyAuxiliaryMarkdownItPackage(packageRoot, consumerRoot) {
    const startup = verifyMarkdownItStartupPackage(packageRoot);
    const require = createRequire(join(packageRoot, 'package.json'));
    const ReferenceMarkdownIt = require('markdown-it');
    const OptimizedMarkdownIt = require('./lib/markdown-it-runtime.js').default;
    const original = new Map();
    const calls = new Map();
    const context = {active: undefined};

    for (const method of ['parse', 'parseInline']) {
        const before = ReferenceMarkdownIt.prototype[method];
        const after = OptimizedMarkdownIt.prototype[method];
        original.set(method, {before, after});
        ReferenceMarkdownIt.prototype[method] = () => {
            assert.fail(`${context.active} used the stock Markdown-it parser`);
        };
        OptimizedMarkdownIt.prototype[method] = function (...args) {
            calls.set(context.active, (calls.get(context.active) || 0) + 1);
            const tokens = after.apply(this, args);
            const check = (items) => {
                for (const token of items) {
                    assert.ok(token instanceof OptimizedMarkdownIt.Token);
                    if (token.children) {
                        check(token.children);
                    }
                }
            };
            check(tokens);
            return tokens;
        };
    }

    try {
        const fixtures = join(consumerRoot, 'auxiliary-parser-fixtures');
        mkdirSync(fixtures, {recursive: true});
        writeFileSync(join(fixtures, 'guide.md'), '# Guide\n');
        const cases = [
            [
                'plugins/visibility',
                'filterAudienceContent',
                (filter) => {
                    const result = filter(
                        ':::visibility human\nShown\n:::\n\n:::visibility agent\nHidden\n:::\n',
                        'human',
                    );
                    assert.equal(result.content, 'Shown\n\n');
                    assert.deepEqual(result.errors, []);
                },
            ],
            [
                'migrations/block-directives',
                'migrateBlockDirectives',
                (migrate) => {
                    const result = migrate('{% note info %}\n\nBody\n\n{% endnote %}');
                    assert.equal(result.output, ':::note {type=info}\n\nBody\n\n:::');
                    assert.deepEqual(result.diagnostics, []);
                    assert.equal(migrate(result.output).output, result.output);
                },
            ],
            [
                'migrations/image-dimensions',
                'migrateImageDimensions',
                (migrate) => {
                    const result = migrate('![alt](image.png =20x30)');
                    assert.equal(result.output, '![alt](image.png){width=20 height=30}');
                    assert.deepEqual(result.diagnostics, []);
                },
            ],
            [
                'migrations/table-alignment',
                'migrateTableAlignment',
                (migrate) => {
                    const result = migrate('#|\r\n|| `a|b` {.cell-align-center} ||\r\n|#\r\n');
                    assert.equal(result.output, '#|\r\n||::{align="center"} `a|b` ||\r\n|#\r\n');
                    assert.deepEqual(result.diagnostics, []);
                },
            ],
            [
                'plugins/links/collect',
                'default',
                (collect) => {
                    assert.equal(
                        collect('[Guide](guide.md)', {
                            root: fixtures,
                            path: join(fixtures, 'source.md'),
                            singlePage: true,
                            deprecationWarnings: false,
                        }),
                        '[Guide](#_guide)',
                    );
                },
            ],
            [
                'plugins/images/collect',
                'default',
                (collect) => {
                    const copied = [];
                    assert.equal(
                        collect('![alt](asset.png)', {
                            root: fixtures,
                            path: join(fixtures, 'source.md'),
                            destPath: join(fixtures, 'out/source.md'),
                            singlePage: true,
                            copyFile: (...args) => copied.push(args),
                        }),
                        '![alt](asset.png)',
                    );
                    assert.deepEqual(copied, [
                        [join(fixtures, 'asset.png'), join(fixtures, 'out/asset.png')],
                    ]);
                },
            ],
        ];
        for (const [module, name, verify] of cases) {
            const cjs = require(`./api/${module}.cjs`);
            const esm = await import(pathToFileURL(join(packageRoot, `api/${module}.mjs`)));
            const cjsFunction = name === 'default' ? cjs : cjs[name];
            assert.equal(cjsFunction, esm[name]);
            for (const [mode, implementation] of [
                ['CJS', cjsFunction],
                ['ESM', esm[name]],
            ]) {
                context.active = `${module}/${mode}`;
                verify(implementation);
                assert.ok(
                    calls.get(context.active) > 0,
                    `${context.active} did not exercise its optimized parser`,
                );
            }
        }
        return {
            startup,
            publicModules: cases.length,
            moduleModes: 2,
            optimizedCalls: Object.fromEntries(calls),
        };
    } finally {
        for (const [method, {before, after}] of original) {
            ReferenceMarkdownIt.prototype[method] = before;
            OptimizedMarkdownIt.prototype[method] = after;
        }
    }
}
