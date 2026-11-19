import type {ParserHost} from '../parser-core';

import {resolvePluginConfiguration} from '../plugin-registry-core';

import {createBrowserApi} from './api';
import {createBrowserHost} from './host';
import {resolveMinimalBrowserOptions} from './options';

const minimalPlugins: ParserHost['defaultPlugins'] = [];
const host = createBrowserHost(minimalPlugins, (options) =>
    resolvePluginConfiguration(options, minimalPlugins, []),
);
const {transform, createParser} = createBrowserApi(host, resolveMinimalBrowserOptions);

export {transform, createParser};
export default transform;
export * from './exports';
export type {
    BrowserMinimalTransformOptions as BrowserTransformOptions,
    BrowserMinimalPluginConfiguration as BrowserPluginConfiguration,
    BrowserSanitizeFunction,
} from './types';
