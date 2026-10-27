import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import MarkdownIt from 'markdown-it';

// The fixture resolves the installed package after it is copied to its consumer.
const packageName = '@diplodoc/transform';
const {default: transform, transform: namedTransform} = await import(packageName);
const {default: parser} = await import(`${packageName}/parser`);
const {default: images, replaceSvgContent} = await import(`${packageName}/plugins/images`);
const {default: log, getLogger} = await import(`${packageName}/log`);
const {createDeprecationReporter} = await import(`${packageName}/deprecation`);
const {getFileTokens} = await import(`${packageName}/utils/fs`);
const configuration = await import(`${packageName}/configuration`);

const require = createRequire(import.meta.url);
const manifest = require(`${packageName}/package.json`);
const cjsConfiguration = require(`${packageName}/configuration`);
assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.window, 'undefined');
assert.equal(transform, namedTransform);
assert.equal(transform, require(packageName));
assert.equal(transform.transform, transform);
assert.equal(parser, require(`${packageName}/parser`));
assert.equal(images, require(`${packageName}/plugins/images`));
assert.equal(images.replaceSvgContent, replaceSvgContent);
assert.equal(log, require(`${packageName}/log`).default);
assert.equal(getFileTokens, require(`${packageName}/lib/utilsFS`).getFileTokens);
const cachedFile = join(process.cwd(), 'mixed-cache-fixture.md');
writeFileSync(cachedFile, 'original cached content');
const state = {md: new MarkdownIt(), env: {}};
const firstTokens = getFileTokens(cachedFile, state, {disableLiquid: true});
writeFileSync(cachedFile, 'changed content on disk');
const cachedTokens = require(`${packageName}/utils/fs`).getFileTokens(cachedFile, state, {
    disableLiquid: true,
});
assert.deepEqual(cachedTokens, firstTokens);
const external = {info() {}, warn() {}, error() {}};
assert.equal(getLogger(external), require(`${packageName}/log`).getLogger(external));
log.clear();
require(`${packageName}/log`).log.warn('mixed module warning');
assert.equal(log.get().warn.length, 1);
createDeprecationReporter().warn(
    {code: 'fixture', feature: 'old', replacement: 'new', removal: {version: '6'}},
    {option: 'old'},
);
assert.equal(require(`${packageName}/log`).log.get().warn.length, 2);
log.clear();
const instance = parser({});
assert.match(instance.compile(instance.parse('# Heading')), /<h1/);
assert.match(transform('SSR text').result.html, /SSR text/);
assert.deepEqual(createRequire(require.resolve(packageName))('js-yaml').load('key: value'), {
    key: 'value',
});

assert.equal(configuration.definePlugin, cjsConfiguration.definePlugin);
assert.equal(configuration.defineTransformOptions, cjsConfiguration.defineTransformOptions);
assert.equal(configuration.builtinPluginIds, cjsConfiguration.builtinPluginIds);
assert.equal(Object.isFrozen(configuration.builtinPluginIds), true);
assert.equal(
    transform('**default preset**', configuration.defineTransformOptions()).result.html,
    transform('**default preset**').result.html,
);
for (const api of [configuration, cjsConfiguration]) {
    let seenContext;
    const collect = (input, options) => `${options.label}:${input}`;
    const badge = api.definePlugin({
        id: 'package/badge',
        requires: ['notes'],
        setup(md, options, context) {
            seenContext = context;
            md.renderer.rules.text = (tokens, index) =>
                options.label + md.utils.escapeHtml(tokens[index].content);
        },
        collect,
    })({label: 'configured:'});
    assert.equal(badge.plugin.collect, collect);
    assert.equal(
        badge.plugin.collect('source', {label: 'collected', tokenStream: []}),
        'collected:source',
    );
    const options = api.defineTransformOptions({
        core: {disableLiquid: true},
        plugins: {preset: 'none', enable: ['notes'], options: {notes: undefined}, plugins: [badge]},
    });
    assert.match(transform('text', options).result.html, /configured:text/);
    assert.equal(seenContext.path, undefined);
    assert.equal(seenContext.log, log);
    assert.equal(typeof seenContext.deprecations.warn, 'function');
    assert.equal(typeof seenContext.generateID, 'function');
    assert.throws(
        () => transform('text', {...options, plugins: []}),
        /either plugins or pluginConfiguration/,
    );
    assert.throws(
        () =>
            transform(
                'text',
                api.defineTransformOptions({plugins: {preset: 'none', plugins: [badge]}}),
            ),
        /unselected plugin/,
    );
}
assert.throws(() => require.resolve(`${packageName}/lib/plugin-configuration`), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
assert.throws(() => require.resolve(`${packageName}/lib/plugin-registry`), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});

for (const [subpath, target] of Object.entries(manifest.exports)) {
    const specifier = `@diplodoc/transform${subpath === '.' ? '' : subpath.slice(1)}`;
    if (typeof target === 'string') {
        if (!subpath.includes('*')) {
            assert.ok(readFileSync(require.resolve(specifier)).length > 0, specifier);
        }
        continue;
    }
    const cjs = require(specifier);
    const esm = await import(specifier);
    assert.equal(require.resolve(specifier).endsWith('.cjs'), true, specifier);
    assert.equal(import.meta.resolve(specifier).endsWith('.mjs'), true, specifier);
    if (esm.default === cjs || typeof cjs === 'function' || Array.isArray(cjs)) {
        assert.equal(esm.default, cjs, specifier);
    } else {
        for (const name of Object.keys(esm)) {
            assert.equal(esm[name], cjs[name], `${specifier}: ${name}`);
        }
    }
}
assert.notEqual(
    require.resolve(`${packageName}/runtime`),
    require.resolve(`${packageName}/runtime/base`),
);
assert.notEqual(
    require.resolve(`${packageName}/runtime`),
    require.resolve(`${packageName}/runtime/yfm-only`),
);
assert.ok(readFileSync(require.resolve(`${packageName}/scss/yfm-base.scss`)).length);
assert.ok(readFileSync(require.resolve(`${packageName}/src/scss/yfm.scss`)).length);
assert.throws(() => require.resolve(`${packageName}/lib/new-private-file`), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
