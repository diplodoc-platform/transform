import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

const packageName = '@diplodoc/transform';
const {
    default: liquidNamespace,
    liquidDocument,
    liquidSnippet,
} = await import(`${packageName}/lib/liquid`);
const {default: yfmlint} = await import(`${packageName}/lib/yfmlint`);
const {createDeprecationReporter} = await import(`${packageName}/deprecation`);
const {getLogger} = await import(`${packageName}/log`);

const load = createRequire(import.meta.url);
const installedRoot = dirname(dirname(load.resolve(packageName)));
const lintPath = join(installedRoot, 'lib/yfmlint/legacy-markdownlint.js');
const fromLint = createRequire(lintPath);
const MarkdownIt = fromLint('markdown-it');
assert.match(fromLint('markdown-it/package.json').version, /^15\./);
assert.throws(() => fromLint.resolve('markdownlint'), {code: 'MODULE_NOT_FOUND'});
assert.match(
    readFileSync(lintPath.replace(/\.js$/, '.LICENSES.txt'), 'utf8'),
    /markdownlint@0\.32\.1/,
);
const cjsLiquid = load('@diplodoc/transform/lib/liquid');
assert.equal(liquidNamespace, cjsLiquid);
assert.equal(liquidDocument, cjsLiquid.default);
assert.equal(liquidSnippet, cjsLiquid.liquidSnippet);
assert.equal(yfmlint, load('@diplodoc/transform/lib/yfmlint'));
const warnings = [];
const logger = {
    info() {},
    error() {},
    warn(message) {
        warnings.push(message);
    },
};
const reporter = createDeprecationReporter({log: logger});
const settings = Object.freeze({log: logger, deprecations: reporter, withSourceMap: true});
for (const liquid of [{liquidDocument, liquidSnippet}, cjsLiquid]) {
    const mapped = liquid.liquidDocument('{{ value }}', {value: 'kept'}, 'legacy.md', settings);
    assert.equal(mapped.output, 'kept');
    assert.equal(typeof mapped.sourceMap, 'object');
    assert.equal(liquid.liquidSnippet('plain', {}, 'legacy.md', settings).output, 'plain');
}
assert.equal(warnings.length, 1);
reporter.reset();
cjsLiquid.liquidDocument('plain', {}, 'legacy.md', settings);
assert.equal(warnings.length, 2);
let lintParser;
yfmlint({
    input: '# heading\n',
    plugins: [
        (md) => {
            lintParser = md;
        },
    ],
    pluginOptions: {log: getLogger(logger), path: 'packed-legacy-lint.md'},
});
assert.ok(lintParser instanceof MarkdownIt);
yfmlint({
    input: '# heading\n',
    pluginOptions: {log: getLogger(logger), path: 'packed-legacy-lint.md'},
});
assert.equal(warnings.filter((message) => message.includes('TRANSFORM_BUNDLED_YFMLINT')).length, 2);
// eslint-disable-next-line no-console -- Report the installed-package gate result.
console.log('Retained legacy engine CJS/ESM identity, source maps and scoped warnings passed');
