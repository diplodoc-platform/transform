import type {CoreParserOptions} from '../parser-options';
import type {BuiltinPluginSettings} from '../plugin-settings';
import type {PluginConfiguration} from '../plugin-core';
import type {SanitizeDataOptions} from '../sanitize-settings';
import type {DocumentEnv} from '../shared-types';
import type {LogLevels} from '../log-core';

/** Existing builtin settings, excluding host filesystem output capabilities. */
export type BrowserBuiltinSettings = {
    [Id in keyof BuiltinPluginSettings]?: Omit<NonNullable<BuiltinPluginSettings[Id]>, 'output'> & {
        output?: never;
    };
};

/** Named composition uses only the actual builtin inventory of the selected entry. */
export interface BrowserPluginConfiguration extends Omit<PluginConfiguration, 'options'> {
    options?: BrowserBuiltinSettings;
}

export type BrowserSanitizeOptions = SanitizeDataOptions;

/** Closed synchronous browser contract; host files and preprocessors are unavailable. */
export interface BrowserTransformOptions extends CoreParserOptions {
    pluginConfiguration?: BrowserPluginConfiguration;
    sanitizeOptions?: BrowserSanitizeOptions;
}

export interface BrowserOutput {
    result: DocumentEnv & {html: string};
    logs: Record<LogLevels, string[]>;
}

/** Minimal has no builtin implementations; custom callbacks remain explicit. */
export interface BrowserMinimalPluginConfiguration extends Omit<
    BrowserPluginConfiguration,
    'enable' | 'disable' | 'options'
> {
    enable?: readonly never[];
    disable?: readonly never[];
    options?: Record<string, never>;
}

export interface BrowserMinimalTransformOptions extends Omit<
    BrowserTransformOptions,
    'pluginConfiguration'
> {
    pluginConfiguration?: BrowserMinimalPluginConfiguration;
}
