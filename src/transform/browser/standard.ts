import {builtinPluginIds} from '../plugin-ids';
import {resolvePluginConfiguration} from '../plugin-registry-core';

import {createBrowserApi} from './api';
import {createBrowserHost} from './host';
import {standardPlugins} from './standard-plugins';

const host = createBrowserHost(standardPlugins, (options) =>
    resolvePluginConfiguration(options, standardPlugins),
);
const {transform, createParser} = createBrowserApi(host, builtinPluginIds);

export {transform, createParser};
export default transform;
export * from './exports';
