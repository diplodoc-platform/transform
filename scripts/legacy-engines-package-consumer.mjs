import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

import liquidDocument, {liquidSnippet} from '@diplodoc/transform/lib/liquid';
import yfmlint from '@diplodoc/transform/lib/yfmlint';
import {createDeprecationReporter} from '@diplodoc/transform/deprecation';
import {getLogger} from '@diplodoc/transform/log';

const load = createRequire(import.meta.url);
const cjsLiquid = load('@diplodoc/transform/lib/liquid');
assert.equal(liquidDocument, cjsLiquid.default);
assert.equal(liquidSnippet, cjsLiquid.liquidSnippet);
assert.equal(yfmlint, load('@diplodoc/transform/lib/yfmlint'));
const warnings = [];
const logger = {
    info() {},
    error() {},
    warn(message) {
        warnings.push(message);
    },
};
const reporter = createDeprecationReporter({log: logger});
const settings = Object.freeze({log: logger, deprecations: reporter, withSourceMap: true});
for (const liquid of [{liquidDocument, liquidSnippet}, cjsLiquid]) {
    const mapped = liquid.liquidDocument('{{ value }}', {value: 'kept'}, 'legacy.md', settings);
    assert.equal(mapped.output, 'kept');
    assert.equal(typeof mapped.sourceMap, 'object');
    assert.equal(liquid.liquidSnippet('plain', {}, 'legacy.md', settings).output, 'plain');
}
assert.equal(warnings.length, 1);
reporter.reset();
cjsLiquid.liquidDocument('plain', {}, 'legacy.md', settings);
assert.equal(warnings.length, 2);
yfmlint({
    input: '# heading\n',
    pluginOptions: {log: getLogger(logger), path: 'packed-legacy-lint.md'},
});
yfmlint({
    input: '# heading\n',
    pluginOptions: {log: getLogger(logger), path: 'packed-legacy-lint.md'},
});
assert.equal(warnings.filter((message) => message.includes('TRANSFORM_BUNDLED_YFMLINT')).length, 2);
// eslint-disable-next-line no-console -- Report the installed-package gate result.
console.log('Retained legacy engine CJS/ESM identity, source maps and scoped warnings passed');
