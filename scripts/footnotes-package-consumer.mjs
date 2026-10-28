import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';

import parser from '@diplodoc/transform/parser';
import {materializeFootnoteTokens} from '@diplodoc/transform/document';
import footnotes from '@diplodoc/transform/plugins/footnotes';
import taskList from '@diplodoc/transform/plugins/task-list';

function verify(html) {
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const match of html.matchAll(
        /(?:footnote-ref[^>]*><a href|class="footnote-backref" href)="#([^"]+)"/g,
    )) {
        assert(ids.includes(match[1]));
    }
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]));
}
let calls = 0;
const generateID = () => `installed-${++calls}`;
const source = '# Title[^a]\n\nbody[^a]\n\n[^a]: - [x] task';
const owned = parser({disableLiquid: true, extractTitle: true, generateID});
const a = owned.parseDocument(source);
const html = owned.compileDocument(a);
verify(a.env.title + html);
assert.match(html, /disabled/);
assert.equal(calls, 1);
const b = owned.parseDocument(source);
owned.compileDocument(b);
assert.equal(owned.compileDocument(a), html);
assert.equal(calls, 2);
const raw = new MarkdownIt().use(footnotes, {generateID, lang: 'en'}).use(taskList);
const env = {footnotes: {caller: true}};
const tokens = raw.parse('note[^a]\n\n[^a]: - [ ] task', env);
const selected = materializeFootnoteTokens(tokens, tokens.slice(0, 3));
assert.equal(calls, 2);
const selectedHtml = raw.renderer.render(selected, raw.options, env);
verify(selectedHtml);
assert.match(selectedHtml, /Back to reference 1/);
assert.match(selectedHtml, /disabled/);
assert.equal(raw.renderer.render(selected, raw.options, env), selectedHtml);
assert.equal(calls, 3);
assert.deepEqual(env, {footnotes: {caller: true}});
process.stdout.write('Installed footnotes/task-list ownership: pass\n');
