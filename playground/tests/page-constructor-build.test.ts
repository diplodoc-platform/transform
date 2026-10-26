import type {OnLoadOptions} from 'esbuild';

import assert from 'node:assert/strict';
import {test} from 'vitest';

import {ts} from '../scripts/configs.mjs';

test.each([
    '/repo/node_modules/@gravity-ui/page-constructor/build/esm/editor/data/index.js',
    'C:\\repo\\node_modules\\@gravity-ui\\page-constructor\\build\\esm\\editor\\data\\index.js',
])('registers the catalogue compatibility loader for %s', (filename) => {
    const loaders: OnLoadOptions[] = [];
    const plugin = ts().plugins.find(({name}) => name === 'page-constructor-compatibility');
    assert.ok(plugin);
    plugin.setup({
        onLoad: (options: OnLoadOptions) => loaders.push(options),
        onResolve: () => {},
    });

    assert.ok(loaders.some(({filter, namespace}) => !namespace && filter.test(filename)));
});
