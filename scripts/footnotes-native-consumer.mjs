import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import MarkdownIt from 'markdown-it';
import footnotes from '@diplodoc/transform/plugins/footnotes';
import {materializeFootnoteTokens} from '@diplodoc/transform/document';

let calls = 0;
const generateID = () => `native-${++calls}`;
const md = new MarkdownIt().use(footnotes, {generateID});
const previous = {caller: true};
const env = {footnotes: previous};
const a = md.parse('A[^a]\n\n[^a]: alpha', env);
const b = md.parse('B[^a]\n\n[^a]: beta', env);
assert.equal(env.footnotes, previous);
assert.equal(calls, 0);
const htmlA = md.renderer.render(a, md.options, env);
const htmlB = md.renderer.render(b, md.options, env);
assert.equal(calls, 2);
assert.notEqual(htmlA, htmlB);
assert.equal(md.renderer.render(a, md.options, env), htmlA);
assert.equal(calls, 2);
const selected = materializeFootnoteTokens(a, a.slice(0, 3));
assert.equal(calls, 2);
const selectedHTML = md.renderer.render(selected, md.options, env);
assert.equal(calls, 3);
for (const html of [htmlA, htmlB, selectedHTML]) {
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]));
}
assert.equal(md.renderInline('inline[^a]', env), 'inline[^a]');
assert.equal(calls, 3);

const require = createRequire(import.meta.url);
const CommonJS = require('markdown-it');
const common = new CommonJS().use(require('@diplodoc/transform/plugins/footnotes').default, {
    generateID: () => 'common',
});
assert.match(common.render('CJS[^a]\n\n[^a]: note'), /footnote-item/);

let gets = 0;
let sets = 0;
const guarded = Object.defineProperty({}, 'footnotes', {
    configurable: true,
    enumerable: true,
    get() {
        gets++;
        throw new Error('caller getter invoked');
    },
    set() {
        sets++;
        throw new Error('caller setter invoked');
    },
});
const descriptor = Object.getOwnPropertyDescriptor(guarded, 'footnotes');
for (const input of ['plain text', 'plain[^a] and ^[inline]']) {
    const bare = new MarkdownIt().renderInline(input, guarded);
    assert.equal(md.renderInline(input, guarded), bare);
    assert.equal(md.renderer.render(md.parseInline(input, guarded), md.options, guarded), bare);
    assert.deepEqual(Object.getOwnPropertyDescriptor(guarded, 'footnotes'), descriptor);
}
assert.equal(gets, 0);
assert.equal(sets, 0);
assert.equal(calls, 3);
