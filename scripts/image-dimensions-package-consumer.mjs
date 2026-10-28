import assert from 'node:assert/strict';
import Module, {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const originalResolve = Module._resolveFilename;
const forbidden = [];
Module._resolveFilename = function (request, ...args) {
    if (
        /^(?:node:)?fs(?:\/|$)/.test(request) ||
        /(?:utilsFS|highlighter|(?:^|\/)liquid(?:\/|$)|plugins\/includes|(?:^|\/)log$|(?:^|\/)deprecation$)/.test(
            request,
        )
    ) {
        forbidden.push(request);
    }
    return originalResolve.call(this, request, ...args);
};
try {
    const cjs = require('@diplodoc/transform/migrations/image-dimensions');
    const esm = await import('@diplodoc/transform/migrations/image-dimensions');
    assert.equal(cjs.migrateImageDimensions, esm.migrateImageDimensions);
    const source = '😀\r\n![alt](image.png "title" =00x20)\r\n';
    const result = esm.migrateImageDimensions(source, {path: '/never/open/this.md'});
    assert.equal(result.output, '😀\r\n![alt](image.png "title"){width=00 height=20}\r\n');
    assert.equal(result.edits.length, 2);
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(esm.migrateImageDimensions(result.output).edits, []);
    const skipped = esm.migrateImageDimensions('![a](a =1%%x2) ![b](b =2x3){width=4}');
    assert.deepEqual(skipped.edits, []);
    assert.deepEqual(
        skipped.diagnostics.map(({reason}) => reason),
        ['noncanonical-dimensions', 'existing-attributes'],
    );
    assert.deepEqual(forbidden, []);
} finally {
    Module._resolveFilename = originalResolve;
}
assert.equal(require('@diplodoc/transform/log').log.isEmpty(), true);
const MarkdownIt = require('markdown-it');

const imsize = require('@diplodoc/transform/plugins/imsize');
const warnings = [];
const md = new MarkdownIt().use(imsize, {
    log: {warn: (message) => warnings.push(message), info() {}, error() {}},
});
assert.equal(md.render('![a](a =20x30)'), md.render('![a](a){width=20 height=30}'));
assert.equal(warnings.length, 1);
assert.match(warnings[0], /IMAGE_SIZE_LEGACY_SYNTAX/);
