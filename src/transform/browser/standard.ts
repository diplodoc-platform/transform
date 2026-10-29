import {builtinPluginIds} from '../plugin-ids';
import cut from '../plugins/cut';
import tabs from '../plugins/tabs';
import {resolvePluginConfiguration} from '../plugin-registry-core';

import {createBrowserApi} from './api';
import {createBrowserHost} from './host';
import {standardPlugins} from './standard-plugins';

const host = createBrowserHost(
    standardPlugins,
    (options) => resolvePluginConfiguration(options, standardPlugins),
    {cut, tabs},
);
const {transform, createParser} = createBrowserApi(host, builtinPluginIds);

export {transform, createParser};
export default transform;
export * from './exports';
