import type {BrowserTransformOptions} from './types';

import {builtinPluginIds} from '../plugin-ids';
import cut from '../plugins/cut';
import tabs from '../plugins/tabs';
import {resolvePluginConfiguration} from '../plugin-registry-core';
import {createSanitizer} from '../sanitize-core';

import {createBrowserApi} from './api';
import {browserCss} from './css';
import {log} from './diagnostics';
import {createBrowserHost} from './host';
import {resolveBrowserOptions} from './options';
import {standardNotes, standardPlugins} from './standard-plugins';

const host = createBrowserHost(
    standardPlugins,
    (options) => resolvePluginConfiguration(options, standardPlugins),
    (html, options, additional, logger) =>
        createSanitizer(browserCss, logger ?? log).sanitize(html, options, additional),
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
