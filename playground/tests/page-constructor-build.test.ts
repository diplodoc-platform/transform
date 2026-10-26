import type {OnLoadOptions} from 'esbuild';

import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {test} from 'vitest';

import {ts} from '../scripts/configs.mjs';

test.each([
    '/repo/node_modules/@gravity-ui/page-constructor/build/esm/editor/data/index.js',
    'C:\\repo\\node_modules\\@gravity-ui\\page-constructor\\build\\esm\\editor\\data\\index.js',
])('registers the catalogue compatibility loader for %s', async (filename) => {
    const loaders: OnLoadOptions[] = [];
    const plugin = ts().plugins.find(({name}) => name === 'page-constructor-compatibility');
    assert.ok(plugin);
    await build({
        stdin: {contents: ''},
        write: false,
        plugins: [
            {
                name: 'capture-loaders',
                setup(buildContext) {
                    return plugin.setup({
                        ...buildContext,
                        onLoad(options, callback) {
                            loaders.push(options);
                            buildContext.onLoad(options, callback);
                        },
                    });
                },
            },
        ],
    });

    assert.ok(loaders.some(({filter, namespace}) => !namespace && filter.test(filename)));
});
