import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

// Verify the installed leaves and passive style graphs without a browser parser host.
export function verifyInlineSyntaxGraph(consumerRoot, buildSync, sass, parseCss) {
    const require = createRequire(`${consumerRoot}/package.json`);
    const graph = buildSync({
        stdin: {
            contents:
                "import underline from '@diplodoc/transform/plugins/underline'; import subscript from '@diplodoc/transform/plugins/subscript'; globalThis.inlineSyntax = {underline, subscript};",
            resolveDir: consumerRoot,
        },
        bundle: true,
        platform: 'browser',
        metafile: true,
        write: false,
        logLevel: 'silent',
    });
    const inputs = Object.keys(graph.metafile.inputs);
    assert.ok(inputs.some((path) => path.includes('markdown-it-ins')));
    assert.ok(inputs.some((path) => path.includes('markdown-it-sub')));
    assert.equal(
        inputs.some((path) =>
            /(?:utilsFS|document-context|highlight\.js|[/\\]liquid[/\\]|plugins[/\\]includes)/.test(
                path,
            ),
        ),
        false,
    );
    assert.equal(
        Object.values(graph.metafile.outputs).some((output) => output.imports.length > 0),
        false,
    );

    function assertRules(css, label) {
        const rules = [];
        function collect(entries) {
            for (const rule of entries || []) {
                if (rule.type === 'rule') rules.push(rule);
                if (rule.rules) collect(rule.rules);
            }
        }
        collect(parseCss(css).stylesheet.rules);
        const underlineRules = rules.filter((rule) => rule.selectors.includes('.yfm u'));
        assert.equal(underlineRules.length, 1, label);
        assert.ok(
            underlineRules[0].declarations.some(
                ({property, value}) => property === 'text-decoration' && value === 'underline',
            ),
            label,
        );
        const subRules = rules.filter((rule) => rule.selectors.includes('.yfm sub'));
        assert.ok(
            subRules.some((rule) =>
                ['font-size', 'line-height', 'vertical-align'].every((property) =>
                    rule.declarations.some((declaration) => declaration.property === property),
                ),
            ),
            label,
        );
        assert.ok(
            subRules.some((rule) =>
                rule.declarations.some(
                    ({property, value}) => property === 'line-height' && value === '0',
                ),
            ),
            label,
        );
    }
    for (const variant of ['', '/base', '/yfm-only', '/print']) {
        assertRules(
            readFileSync(require.resolve(`@diplodoc/transform/styles${variant}`), 'utf8'),
            `styles${variant}`,
        );
    }
    for (const name of ['base', '_yfm-only', 'print', 'yfm-base']) {
        const result = sass.compileString(`@use "pkg:@diplodoc/transform/scss/${name}.scss";`, {
            importers: [new sass.NodePackageImporter(consumerRoot)],
            logger: sass.Logger.silent,
        });
        assertRules(result.css, `scss/${name}`);
        assert.ok(result.loadedUrls.some((url) => url.pathname.endsWith('/_inline-syntax.scss')));
    }
}
