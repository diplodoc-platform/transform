import {execFileSync} from 'node:child_process';

/**
 * Check cold installed loading before any stock-parser reference probe runs.
 * @param {string} packageRoot - Installed package directory.
 * @returns {object} Actual bare imports requested by dependencies during startup.
 */
export function verifyMarkdownItStartupPackage(packageRoot) {
    const code = String.raw`
import assert from 'node:assert/strict';
import {realpathSync} from 'node:fs';
import Module, {createRequire} from 'node:module';
import {join, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = realpathSync(process.argv[1]);
const require = createRequire(join(root, 'package.json'));
const dependencyRoot = join(root, 'node_modules') + sep;
const isCoreOwned = (parent) => parent?.startsWith(root + sep) && !parent.startsWith(dependencyRoot);
assert.equal(isCoreOwned(join(root, 'lib/markdown-it-utils.js')), true);
assert.equal(isCoreOwned(join(root, 'api/index.cjs')), true);
assert.equal(isCoreOwned(join(root, 'node_modules/@diplodoc/file-extension/build/plugin/index-node.js')), false);
const load = Module._load;
const bareImports = [];
Module._load = function (request, parent, ...args) {
    if (request === 'markdown-it') {
        bareImports.push({parent: parent?.filename, resolved: Module._resolveFilename(request, parent)});
    }
    return load.call(this, request, parent, ...args);
};
try {
    const {escapeHtml} = require('./lib/markdown-it-utils.js');
    assert.equal(escapeHtml('<>&"'), '&lt;&gt;&amp;&quot;');
    assert.deepEqual(bareImports, [], 'Core escape utility loaded bare Markdown-it');
    const cjs = require('./api/index.cjs');
    const esm = await import(pathToFileURL(join(root, 'api/index.mjs')));
    assert.equal(cjs, esm.default);
    assert.ok(cjs('A **strong** body.').result.html.includes('<strong>strong</strong>'));
    const coreImports = bareImports.filter(({parent}) => isCoreOwned(parent));
    assert.deepEqual(coreImports, [], 'Core runtime loaded bare Markdown-it');
    console.log(JSON.stringify({utilityBareImports: 0, coreBareImports: 0, dependencyBareImports: bareImports}));
} finally {
    Module._load = load;
}
`;
    return JSON.parse(
        execFileSync(process.execPath, ['--input-type=module', '-e', code, packageRoot], {
            encoding: 'utf8',
        }),
    );
}
