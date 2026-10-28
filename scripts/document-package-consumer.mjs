/* eslint-disable no-console -- Print the installed-package acceptance result. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const common = require('@diplodoc/transform/document');
const esm = await import('@diplodoc/transform/document');
assert.equal(common.createDocumentEnv, esm.createDocumentEnv);
assert.equal(Object.getPrototypeOf(common.createDocumentEnv()), Object.prototype);

if (process.argv.includes('--native13')) {
    const MarkdownIt = require('markdown-it');
    assert.match(require('markdown-it/package.json').version, /^13\./);
    const {envMeta} = common;
    const md = new MarkdownIt().use(envMeta);
    const a = common.createDocumentEnv();
    const b = common.createDocumentEnv();
    md.render('---\nname: A\n---\nbody', a);
    md.render('body', b);
    assert.deepEqual(a.meta, {name: 'A'});
    assert.deepEqual(b.meta, {});
    const meta = require('@diplodoc/transform/plugins/meta');
    for (const method of ['render', 'renderInline']) {
        const native = new MarkdownIt().use(meta);
        const environments = [];
        native.core.ruler.push('document-resources', (state) => {
            if (state.inlineMode) {
                state.env.meta = {name: state.src};
            }
            state.env.assets = [state.env.meta.name];
            environments.push(state.env);
        });
        native.renderer.rules.text = (tokens, index, _options, env) => {
            assert.equal(native.meta, env.meta);
            assert.equal(native.assets, env.assets);
            if (tokens[index].content === 'B') {
                throw new Error('native render failure');
            }
            return tokens[index].content;
        };
        const input = (name) => (method === 'render' ? `---\nname: ${name}\n---\n${name}` : name);
        assert.match(native[method](input('A')), /A/);
        const previousMeta = native.meta;
        const previousAssets = native.assets;
        assert.deepEqual(previousMeta, {name: 'A'});
        assert.throws(() => native[method](input('B')), /native render failure/);
        assert.deepEqual(environments[1].meta, {name: 'B'});
        assert.equal(native.meta, previousMeta);
        assert.equal(native.assets, previousAssets);
        assert.match(native[method](input('C')), /C/);
        assert.equal(native.meta, environments[2].meta);
        assert.equal(native.assets, environments[2].assets);
        assert.deepEqual(native.meta, {name: 'C'});
        assert.equal(new Set(environments).size, 3);
    }
    for (const api of [common, esm]) {
        const native = new MarkdownIt().use(meta);
        native.core.ruler.push('merge-resources', (state) => {
            state.env.assets = [state.src === 'child' ? '/child.png' : '/A.png'];
            if (state.src === 'child') state.env.meta.script = ['/child.js'];
        });
        native.render('---\nname: A\n---\nA');
        const previousMeta = native.meta;
        const previousAssets = native.assets;
        const invalid = api.createDocumentEnv();
        invalid.meta = {script: 'invalid'};
        let failed;
        assert.throws(() => {
            failed = api.parseDocumentFragmentResult(native, 'child', invalid, {
                purpose: 'include',
            });
        }, /meta.script/);
        assert.equal(failed, undefined);
        assert.equal(native.meta, previousMeta);
        assert.equal(native.assets, previousAssets);
        assert.deepEqual(native.meta, {name: 'A'});
        assert.deepEqual(native.assets, ['/A.png']);
        assert.deepEqual(invalid.meta, {script: 'invalid'});
        assert.equal(invalid.assets, undefined);
        const valid = api.createDocumentEnv();
        const fragment = api.parseDocumentFragmentResult(native, 'child', valid, {
            purpose: 'include',
        });
        assert.equal(fragment.tokens.length, 3);
        assert.equal(native.meta, valid.meta);
        assert.equal(native.assets, valid.assets);
        assert.deepEqual(valid.meta, {script: ['/child.js']});
        assert.deepEqual(valid.assets, ['/child.png']);
    }
} else {
    const factories = [
        require('@diplodoc/transform/parser'),
        (await import('@diplodoc/transform/parser')).default,
    ];
    for (const parser of factories) {
        const md = parser({disableLiquid: true});
        const legacy = md.env;
        const a = md.parseDocument('---\nname: A\n---\nA');
        const b = md.parseDocument('B');
        assert.deepEqual(b.env.meta, {});
        assert.deepEqual(a.env.meta, {name: 'A'});
        assert.match(md.compile(a.tokens), /A/);
        assert.equal(legacy.meta, a.env.meta);
        assert.match(md.compileDocument(b), /B/);
        assert.notEqual(a.env, b.env);
    }
}
// Both facades replay the same opaque, parser-owned contribution handle.
for (const api of [common, esm]) {
    let native;
    let parses = 0;
    require('@diplodoc/transform/parser')({
        plugins: [
            (md) => {
                native = md;
                md.core.ruler.push('captured-resource', (state) => {
                    parses++;
                    state.env.assets = ['child.png'];
                    state.env.meta = {script: ['child.js']};
                    state.env.terms = {...state.env.terms, child: 'definition'};
                });
            },
        ],
    });
    const a = api.createDocumentEnv();
    a.terms = {parent: 'A'};
    const fragment = api.parseDocumentFragmentResult(native, 'child', a, {purpose: 'reference'});
    assert.equal(a.assets, undefined);
    const b = api.createDocumentEnv();
    api.replayDocumentFragment(native, fragment, b, {purpose: 'include'});
    api.replayDocumentFragment(native, fragment, b, {purpose: 'include'});
    assert.deepEqual(b.assets, ['child.png']);
    assert.deepEqual(b.meta, {script: ['child.js']});
    assert.deepEqual(b.terms, {child: 'definition'});
    assert.equal(parses, 1);
    assert.throws(
        () =>
            api.replayDocumentFragment(native, {tokens: fragment.tokens}, b, {purpose: 'include'}),
        /configured parser/,
    );
}
console.log(
    'Installed document runtime passed' +
        (process.argv.includes('--native13') ? ' (native MarkdownIt 13)' : ' (CJS/ESM)'),
);
