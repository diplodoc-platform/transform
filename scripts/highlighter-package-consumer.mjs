/* eslint-disable no-console -- Assert that real library calls emit no deprecation console warnings. */
import assert from 'node:assert/strict';
import Module, {createRequire} from 'node:module';

const packageName = '@diplodoc/transform';
const require = createRequire(import.meta.url);
const resolutions = [];
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === 'highlight.js' || request.startsWith('highlight.js/')) {
        resolutions.push(request);
    }
    return originalResolve.call(this, request, ...args);
};
const transform = require(packageName);
require(`${packageName}/parser`);
require(`${packageName}/configuration`);
const adapter = require(`${packageName}/highlighter`);
const native = await import(`${packageName}/highlighter`);
assert.equal(native.createHighlightJsHighlighter, adapter.createHighlightJsHighlighter);
const source = '```javascript\nconst x = "<script>&";\n```';
const plain = transform(source).result.html;
assert.match(plain, /&lt;script&gt;&amp;/);
assert.doesNotMatch(plain, /hljs/);
assert.deepEqual(resolutions, []);
assert.equal(
    Object.keys(require.cache).some((path) => /node_modules[/\\]highlight\.js[/\\]/.test(path)),
    false,
);
Module._resolveFilename = originalResolve;

if (process.argv.includes('--selected-core')) {
    const {version} = require('highlight.js/package.json');
    const legacyPaths = version.startsWith('10.');
    const warnings = [];
    const oldWarn = console.warn;
    const oldLog = console.log;
    console.warn = (...args) => warnings.push(args.join(' '));
    console.log = (...args) => warnings.push(args.join(' '));
    try {
        // The application chooses version-specific native paths before synchronous rendering.
        const [module, javascript] = await Promise.all([
            legacyPaths ? import('highlight.js/lib/core.js') : import('highlight.js/lib/core'),
            legacyPaths
                ? import('highlight.js/lib/languages/javascript.js')
                : import('highlight.js/lib/languages/javascript'),
        ]);
        assert.deepEqual(module.default.listLanguages(), []);
        const highlighter = native.createHighlightJsHighlighter(module, {
            languages: {javascript: javascript.default},
            allowedLanguages: ['javascript', 'js'],
        });
        assert.deepEqual(module.default.listLanguages(), ['javascript']);
        const result = transform(source, {highlighter});
        assert.equal(typeof result.then, 'undefined');
        assert.match(result.result.html, /hljs-keyword/);
        assert.match(
            transform(source.replace('```javascript', '```js'), {highlighter}).result.html,
            /hljs-keyword/,
        );
    } finally {
        console.warn = oldWarn;
        console.log = oldLog;
    }
    assert.deepEqual(
        warnings,
        [],
        'Native selected imports must not use deprecated language shims',
    );
    console.log(`Native selected-core/grammar imports passed for ${version}`);
} else if (process.argv.includes('--without-peer')) {
    const {createLegacyHighlighter} = require(`${packageName}/highlighter/legacy`);
    const warnings = [];
    const log = {warn: (message) => warnings.push(message), info() {}, error() {}};
    const highlighter = createLegacyHighlighter({}, {log});
    assert.equal(transform(source, {highlighter}).result.html, plain);
    assert.match(warnings.join(), /LEGACY_HIGHLIGHTER_FACTORY/);
    console.log('No-peer loading and structural API checks passed');
} else {
    const hljs = require('highlight.js');
    const namespace = await import('highlight.js');
    const warnings = [];
    const oldWarn = console.warn;
    const oldLog = console.log;
    console.warn = (...args) => warnings.push(args.join(' '));
    console.log = (...args) => warnings.push(args.join(' '));
    try {
        for (const module of [hljs, namespace.default, namespace]) {
            let actualApi;
            const highlighter = adapter.createHighlightJsHighlighter(module, {
                languages: {
                    custom: (api) => {
                        actualApi = api;
                        return {contains: [{begin: /fixture/, className: 'keyword'}]};
                    },
                },
            });
            const output = transform(source, {highlighter}).result.html;
            assert.match(output, /hljs-keyword/);
            assert.match(output, /class="hljs javascript"/);
            assert.match(
                transform('```custom\nfixture\n```', {highlighter}).result.html,
                /hljs-keyword/,
            );
            assert.equal(actualApi, hljs);
            assert.doesNotMatch(
                transform(source, {
                    highlighter: adapter.createHighlightJsHighlighter(module, {
                        allowedLanguages: [],
                    }),
                }).result.html,
                /hljs-keyword/,
            );
        }
        const legacy = require(`${packageName}/lib/highlight`);
        assert.equal(legacy, require(`${packageName}/lib/highlight.js`));
        assert.match(legacy()('const x = 1;', 'javascript'), /hljs-keyword/);
    } finally {
        console.warn = oldWarn;
        console.log = oldLog;
    }
    assert.deepEqual(warnings, [], 'The adapter must not invoke a deprecated library call shape');
    console.log(`Explicit highlighter runtime passed for ${hljs.versionString}`);
}
