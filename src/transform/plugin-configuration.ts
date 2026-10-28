import type {OptionsType} from './typings';
import type {LegacyBuiltinOptions} from './plugin-settings';
import type {PluginConfiguration} from './plugin-core';

export {builtinPluginIds} from './plugin-ids';
export type {BuiltinPluginId} from './plugin-ids';
export type {BuiltinPluginSettings, LegacyBuiltinOptions} from './plugin-settings';
export {definePlugin, defineLegacyPlugin} from './plugin-core';
export type {
    PluginContext,
    PluginOrdering,
    PluginDefinition,
    ConfiguredPlugin,
    PluginConfiguration,
    PluginInstallation,
} from './plugin-core';

type NamedOptions = {
    [Key in keyof OptionsType as string extends Key ? never : Key]: OptionsType[Key];
};

type BuiltinOptionKey =
    | keyof LegacyBuiltinOptions
    | 'supportGithubAnchors'
    | 'disableCommonAnchors'
    | 'useCommonAnchorButtons'
    | 'codeLineWrapping'
    | 'contentAudience';

/** Closed core settings; builtin-specific configuration lives under plugins.options. */
export type TransformCoreOptions = Omit<
    NamedOptions,
    BuiltinOptionKey | 'plugins' | 'pluginConfiguration'
>;

export interface TransformConfiguration {
    core?: TransformCoreOptions;
    plugins?: PluginConfiguration;
}

/**
 * Create options for the existing synchronous transform API through a closed typed contract.
 * @param configuration - Core options and independent plugin configuration.
 * @returns Options accepted by the existing synchronous transform entrypoint.
 */
export function defineTransformOptions(
    configuration: TransformConfiguration & {core: TransformCoreOptions & {tokens: true}},
): OptionsType & {tokens: true};
export function defineTransformOptions(configuration?: TransformConfiguration): OptionsType;
export function defineTransformOptions(configuration: TransformConfiguration = {}): OptionsType {
    return {...configuration.core, pluginConfiguration: configuration.plugins ?? {}};
}
