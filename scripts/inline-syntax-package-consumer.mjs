import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const packageName = '@diplodoc/transform';
const {default: transform} = await import(packageName);
const {default: DefaultPlugins} = await import(`${packageName}/plugins`);
const {builtinPluginIds, defineTransformOptions} = await import(`${packageName}/configuration`);
const {default: underline} = await import(`${packageName}/plugins/underline`);
const {default: subscript} = await import(`${packageName}/plugins/subscript`);

const require = createRequire(import.meta.url);
const cjsTransform = require(packageName);
assert.equal(underline, require('@diplodoc/transform/plugins/underline').default);
assert.equal(subscript, require('@diplodoc/transform/plugins/subscript').default);
assert.equal(DefaultPlugins.length, 21);
assert.deepEqual(builtinPluginIds.slice(17, 19), ['underline', 'subscript']);
assert.deepEqual(DefaultPlugins.slice(17, 19), [underline, subscript]);
const nativeRequire = createRequire(require.resolve(packageName));
assert.equal(nativeRequire('markdown-it/package.json').version, '15.0.3');
assert.equal(nativeRequire('markdown-it-ins/package.json').version, '4.0.0');
assert.equal(nativeRequire('markdown-it-sub/package.json').version, '2.0.0');
const MarkdownIt = nativeRequire('markdown-it');
assert.equal(
    new MarkdownIt().use(underline).use(subscript).renderInline('+++x+++ H~2~O'),
    '+<u>x</u>+ H<sub>2</sub>O',
);

for (const api of [transform, cjsTransform]) {
    for (const enableMarkdownAttrs of [false, true]) {
        const core = {enableMarkdownAttrs, linkify: true};
        const source = '++https://example.com++ H~2~O';
        assert.equal(
            api(source, core).result.html,
            '<p><u><a href="https://example.com">https://example.com</a></u> H<sub>2</sub>O</p>\n',
        );
        assert.equal(
            api(source, defineTransformOptions({core})).result.html,
            api(source, core).result.html,
        );
        assert.equal(
            api(source, defineTransformOptions({core, plugins: {disable: ['underline']}})).result
                .html,
            '<p>++https://example.com++ H<sub>2</sub>O</p>\n',
        );
        assert.equal(
            api(source, defineTransformOptions({core, plugins: {disable: ['subscript']}})).result
                .html,
            '<p><u><a href="https://example.com">https://example.com</a></u> H~2~O</p>\n',
        );
        for (const [enable, html] of [
            [[], '<p>++x++ H~2~O</p>\n'],
            [['underline'], '<p><u>x</u> H~2~O</p>\n'],
            [['subscript'], '<p>++x++ H<sub>2</sub>O</p>\n'],
            [['underline', 'subscript'], '<p><u>x</u> H<sub>2</sub>O</p>\n'],
        ]) {
            assert.equal(
                api(
                    '++x++ H~2~O',
                    defineTransformOptions({core, plugins: {preset: 'none', enable}}),
                ).result.html,
                html,
            );
        }
        assert.equal(
            api('++x++ H~2~O', {...core, plugins: []}).result.html,
            '<p>++x++ H~2~O</p>\n',
        );
        assert.equal(
            api('++x++ H~2~O', {...core, plugins: [underline, subscript]}).result.html,
            '<p><u>x</u> H<sub>2</sub>O</p>\n',
        );
        assert.throws(
            () => api('text', {pluginConfiguration: {options: {underline: {tag: 'ins'}}}}),
            /Unknown option/,
        );
        assert.throws(
            () => api('text', {pluginConfiguration: {options: {subscript: {parseInline: true}}}}),
            /Unknown option/,
        );
    }
}
for (const name of ['underline', 'subscript']) {
    assert.throws(() => require.resolve(`@diplodoc/transform/lib/plugins/${name}`), {
        code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    });
}
