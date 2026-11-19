import type {BrowserTransformOptions} from './types';

import {builtinPluginIds} from '../plugin-ids';
import cut from '../plugins/cut';
import tabs from '../plugins/tabs';
import {resolvePluginConfiguration} from '../plugin-registry-core';

import {createBrowserApi} from './api';
import {createBrowserHost} from './host';
import {resolveBrowserOptions} from './options';
import {standardNotes, standardPlugins} from './standard-plugins';

const host = createBrowserHost(
    standardPlugins,
    (options) => resolvePluginConfiguration(options, standardPlugins),
    {cut, tabs, notes: standardNotes},
);
const {transform, createParser} = createBrowserApi(
    host,
    (options: BrowserTransformOptions = {}) => ({
        options: resolveBrowserOptions(options, builtinPluginIds),
    }),
);

export {transform, createParser};
export default transform;
export * from './exports';
