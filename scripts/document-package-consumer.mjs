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
console.log(
    'Installed document runtime passed' +
        (process.argv.includes('--native13') ? ' (native MarkdownIt 13)' : ' (CJS/ESM)'),
);
