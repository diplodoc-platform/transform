import type {OptionsType} from '../typings';
import type {BuiltinPluginId} from '../plugin-ids';
import type {
    BrowserPluginConfiguration,
    BrowserSanitizeOptions,
    BrowserTransformOptions,
} from './types';

import {builtinPluginIds} from '../plugin-ids';
import {builtinOptionKeys} from '../plugin-settings';

import {BrowserUnsupportedFeatureError} from './errors';
import {validBuiltinValue, validCoreValue, validIdList, validSanitizeValue} from './validation';

const coreKeys = new Set(
    Object.keys({
        allowHTML: true,
        linkify: true,
        linkifyTlds: true,
        breaks: true,
        disableRules: true,
        lang: true,
        extractTitle: true,
        needTitle: true,
        needFlatListHeadings: true,
        renderInline: true,
        enableMarkdownAttrs: true,
        leftDelimiter: true,
        rightDelimiter: true,
        highlighter: true,
        generateID: true,
        log: true,
        compatibility: true,
        pluginConfiguration: true,
        sanitizeOptions: true,
    } satisfies Record<keyof BrowserTransformOptions, true>),
);
const configurationKeys = new Set(
    Object.keys({
        preset: true,
        enable: true,
        disable: true,
        options: true,
        plugins: true,
    } satisfies Record<keyof BrowserPluginConfiguration, true>),
);
const sanitizeKeys = new Set(
    Object.keys({
        cssWhiteList: true,
        allowedTags: true,
        allowedAttributes: true,
        allowedSchemes: true,
        allowedSchemesByTag: true,
        allowedSchemesAppliedToAttributes: true,
        allowProtocolRelative: true,
    } satisfies Record<keyof BrowserSanitizeOptions, true>),
);

function unsupported(option: string): never {
    throw new BrowserUnsupportedFeatureError(
        'option',
        'Use the Node entry for host services, or preprocess on the host and pass supported browser options',
        undefined,
        option,
    );
}

function validateKeys(value: object, keys: ReadonlySet<string>, prefix = ''): void {
    for (const key of Object.keys(value)) {
        if (!keys.has(key)) {
            unsupported(`${prefix}${key}`);
        }
    }
}

function requireObject(value: unknown, option: string): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`Browser option "${option}" must be an object`);
    }
}

function requireBuiltin(value: string): asserts value is BuiltinPluginId {
    if (!builtinPluginIds.some((id) => id === value)) {
        throw new BrowserUnsupportedFeatureError(
            'builtin',
            'Choose an available builtin or register an explicit compatible plugin',
            undefined,
            value,
        );
    }
}

function validateValues(
    value: object,
    validate: (key: string, value: unknown) => boolean,
    prefix = '',
): void {
    for (const [key, setting] of Object.entries(value)) {
        if (setting !== undefined && !validate(key, setting)) {
            throw new TypeError(`Invalid browser option "${prefix}${key}"`);
        }
    }
}

function requireAvailable(id: BuiltinPluginId, available: readonly BuiltinPluginId[]): void {
    if (!available.includes(id)) {
        throw new BrowserUnsupportedFeatureError(
            'builtin',
            'Import @diplodoc/transform/browser for standard builtins, or register an explicit compatible plugin',
            undefined,
            id,
        );
    }
}

function validateConfiguration(configuration: BrowserPluginConfiguration): void {
    if (configuration.preset !== undefined && !['default', 'none'].includes(configuration.preset)) {
        throw new TypeError('Invalid browser option "pluginConfiguration.preset"');
    }
    for (const key of ['enable', 'disable'] as const) {
        if (configuration[key] !== undefined && !validIdList(configuration[key])) {
            throw new TypeError(`Invalid browser option "pluginConfiguration.${key}"`);
        }
    }
    if (configuration.plugins !== undefined) {
        if (!Array.isArray(configuration.plugins)) {
            throw new TypeError('Invalid browser option "pluginConfiguration.plugins"');
        }
        const plugins: readonly unknown[] = configuration.plugins;
        for (const plugin of plugins) {
            if (
                !plugin ||
                typeof plugin !== 'object' ||
                Array.isArray(plugin) ||
                !('id' in plugin) ||
                !('plugin' in plugin) ||
                typeof plugin.id !== 'string' ||
                typeof plugin.plugin !== 'function'
            ) {
                throw new TypeError('Browser plugins must provide an ID and installation callback');
            }
            for (const [key, constraint] of Object.entries(plugin)) {
                if (
                    ['requires', 'before', 'after'].includes(key) &&
                    constraint !== undefined &&
                    !validIdList(constraint)
                ) {
                    throw new TypeError(`Invalid browser plugin constraint "${key}"`);
                }
            }
        }
    }
}

/**
 * Reject unsupported host capabilities before native parser construction or caller setup.
 * @param options - Closed caller settings, also validated for JavaScript consumers.
 * @param available - This entry's actual finite builtin inventory.
 * @returns A fresh shared-parser options object without mutating caller settings.
 */
export function resolveBrowserOptions(
    options: BrowserTransformOptions,
    available: readonly BuiltinPluginId[],
): OptionsType {
    requireObject(options, 'options');
    validateKeys(options, coreKeys);
    validateValues(options, validCoreValue);
    const configuration: BrowserPluginConfiguration = options.pluginConfiguration ?? {};
    requireObject(configuration, 'pluginConfiguration');
    validateKeys(configuration, configurationKeys, 'pluginConfiguration.');
    validateConfiguration(configuration);

    for (const id of [...(configuration.enable ?? []), ...(configuration.disable ?? [])]) {
        requireBuiltin(id);
        requireAvailable(id, available);
    }
    if (configuration.options !== undefined) {
        requireObject(configuration.options, 'pluginConfiguration.options');
        for (const [id, settings] of Object.entries(configuration.options)) {
            requireBuiltin(id);
            requireAvailable(id, available);
            if (settings === undefined) {
                continue;
            }
            requireObject(settings, `pluginConfiguration.options.${id}`);
            const supported = new Set(builtinOptionKeys[id].filter((key) => key !== 'output'));
            validateKeys(settings, supported, `pluginConfiguration.options.${id}.`);
            validateValues(settings, validBuiltinValue, `pluginConfiguration.options.${id}.`);
        }
    }
    if (options.sanitizeOptions !== undefined) {
        requireObject(options.sanitizeOptions, 'sanitizeOptions');
        validateKeys(options.sanitizeOptions, sanitizeKeys, 'sanitizeOptions.');
        validateValues(options.sanitizeOptions, validSanitizeValue, 'sanitizeOptions.');
    }
    return {
        ...options,
        enableMarkdownAttrs: available.length
            ? options.enableMarkdownAttrs
            : (options.enableMarkdownAttrs ?? false),
        pluginConfiguration: configuration,
        sanitizeOptions: options.sanitizeOptions ? {...options.sanitizeOptions} : undefined,
    };
}
