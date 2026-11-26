import type {OptionsType} from './typings';

import DefaultPlugins from './plugins';
import {resolvePluginConfiguration as resolve} from './plugin-registry-core';

/**
 * Resolve named composition using the established Node builtin callbacks.
 * @param options - Current transform options.
 * @returns Selected installations, or the legacy callback path.
 */
export function resolvePluginConfiguration(options: OptionsType) {
    return resolve(options, DefaultPlugins);
}
