import assert from 'node:assert/strict';
import Module, {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const originalResolve = Module._resolveFilename;
const forbidden = [];
Module._resolveFilename = function (request, ...args) {
    if (
        /^(?:node:)?fs(?:\/|$)/.test(request) ||
        /(?:utilsFS|highlighter|(?:^|\/)liquid(?:\/|$)|plugins\/includes)/.test(request)
    ) {
        forbidden.push(request);
    }
    return originalResolve.call(this, request, ...args);
};
try {
    const cjs = require('@diplodoc/transform/migrations/table-alignment');
    const esm = await import('@diplodoc/transform/migrations/table-alignment');
    assert.equal(cjs.migrateTableAlignment, esm.migrateTableAlignment);
    const source = '#|\r\n|| `a|b` {.cell-align-center} ||\r\n|#\r\n';
    const result = esm.migrateTableAlignment(source, {path: '/missing/diagnostic-label.md'});
    assert.equal(result.output, '#|\r\n||::{align="center"} `a|b` ||\r\n|#\r\n');
    assert.equal(result.edits.length, 2);
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(esm.migrateTableAlignment(result.output).edits, []);
    const nested = '#|\n|| A {.cell-align-center} |\n\n    #|\n    || inner ||\n    |#\n\n||\n|#';
    const nestedResult = esm.migrateTableAlignment(nested);
    assert.equal(nestedResult.output, nested);
    assert.deepEqual(nestedResult.edits, []);
    assert.equal(nestedResult.diagnostics[0]?.reason, 'nested-or-spanning-table');
    const unclosed = '#|\n|| Text {.cell-align-center}';
    const unclosedResult = esm.migrateTableAlignment(unclosed);
    assert.equal(unclosedResult.output, unclosed);
    assert.deepEqual(unclosedResult.edits, []);
    assert.equal(unclosedResult.diagnostics[0]?.reason, 'unclosed-table');
    assert.deepEqual(forbidden, []);
    assert.equal(require('@diplodoc/transform/log').log.isEmpty(), true);
} finally {
    Module._resolveFilename = originalResolve;
}
