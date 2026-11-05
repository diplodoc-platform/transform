/* eslint-disable no-console -- Report installed native diagnostics acceptance. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const nodeEsm = await import('@diplodoc/transform');
const logEsm = await import('@diplodoc/transform/log');
const parserEsm = await import('@diplodoc/transform/parser');
const nodeCommon = require('@diplodoc/transform');
const logCommon = require('@diplodoc/transform/log');
assert.equal(logEsm.createDiagnosticCollector, logCommon.createDiagnosticCollector);
logEsm.log.clear();

for (const [transform, factory, parse] of [
    [nodeCommon, logCommon.createDiagnosticCollector, require('@diplodoc/transform/parser')],
    [nodeEsm.default, logEsm.createDiagnosticCollector, parserEsm.default],
]) {
    const diagnostics = factory();
    const first = transform('first', {path: 'first.md', plugins: [], diagnostics});
    const saved = structuredClone(first.logs);
    const second = transform('second', {path: 'second.md', plugins: [], diagnostics});
    assert.equal(first.logs.warn.length, 1);
    assert.equal(second.logs.warn.length, 1);
    assert.equal(diagnostics.get().warn.length, 2);
    diagnostics.clear();
    assert.deepEqual(first.logs, saved);
    transform('tokens', {tokens: true, path: 'tokens.md', plugins: [], diagnostics});
    assert.equal(diagnostics.get().warn.length, 1);
    assert.throws(() => transform('---\ninvalid: [\n---\ntext', {diagnostics}));
    assert.match(diagnostics.get().error.join(), /Error occurred/);
    const plugin = (md, options) => {
        options.log.warn('setup');
        md.core.ruler.push('diagnostic', (state) => options.log.warn(state.src));
        md.renderer.rules.paragraph_open = () => {
            options.log.info('render');
            return '<p>';
        };
    };
    const parser = parse({plugins: [plugin], disableLiquid: true});
    const a = parser.parseDocument('A');
    const b = parser.parseDocument('B');
    parser.compileDocument(a);
    assert.deepEqual(a.logs.warn, ['WARN setup', 'WARN A']);
    assert.deepEqual(a.logs.info, ['INFO render']);
    assert.deepEqual(b.logs.warn, ['WARN B']);
    assert.deepEqual(b.logs.info, []);
}
assert.equal(logEsm.log.isEmpty(), true);

for (const name of ['@diplodoc/transform/browser', '@diplodoc/transform/browser/minimal']) {
    const api = await import(name);
    const diagnostics = api.createDiagnosticCollector();
    const custom = api.definePlugin({
        id: 'fixture/logs',
        setup(md, _options, context) {
            context.log.warn('setup');
            md.core.ruler.push('diagnostic', (state) => context.log.warn(state.src));
        },
    })({});
    const options = {diagnostics, pluginConfiguration: {preset: 'none', plugins: [custom]}};
    const first = api.transform('first', options);
    const second = api.transform('second', options);
    assert.deepEqual(first.logs.warn, ['WARN setup', 'WARN first']);
    assert.deepEqual(second.logs.warn, ['WARN setup', 'WARN second']);
    diagnostics.clear();
    assert.deepEqual(first.logs.warn, ['WARN setup', 'WARN first']);
    const parser = api.createParser(options);
    const a = parser.parseDocument('A');
    const b = parser.parseDocument('B');
    parser.compileDocument(a);
    assert.deepEqual(a.logs.warn, ['WARN setup', 'WARN A']);
    assert.deepEqual(b.logs.warn, ['WARN B']);
}
console.log(
    'Installed native CJS/ESM and browser document diagnostics, shared collectors and strict handle contracts passed',
);
