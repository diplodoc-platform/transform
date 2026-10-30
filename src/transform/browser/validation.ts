import {supportedLanguages} from '../shared-types';

function strings(value: unknown): boolean {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function record(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringMap(value: unknown): boolean {
    return record(value) && Object.values(value).every(strings);
}

function attribute(value: unknown): boolean {
    return (
        typeof value === 'string' ||
        (record(value) &&
            typeof value.name === 'string' &&
            strings(value.values) &&
            (value.multiple === undefined || typeof value.multiple === 'boolean') &&
            Object.keys(value).every((key) => ['name', 'multiple', 'values'].includes(key)))
    );
}

/**
 * Validate browser values independently of Node's historical permissive option surface.
 * @param key - Accepted core setting name.
 * @param value - Present value from a JavaScript caller.
 * @returns Whether the value satisfies the closed public contract.
 */
export function validCoreValue(key: string, value: unknown): boolean {
    switch (key) {
        case 'highlighter':
        case 'generateID':
            return typeof value === 'function';
        case 'leftDelimiter':
        case 'rightDelimiter':
            return typeof value === 'string';
        case 'disableRules':
            return strings(value);
        case 'linkifyTlds':
            return typeof value === 'string' || strings(value);
        case 'lang':
            return supportedLanguages.some((lang) => lang === value);
        case 'log':
            return (
                record(value) &&
                ['info', 'warn', 'error'].every((method) => typeof value[method] === 'function')
            );
        case 'compatibility':
            return (
                record(value) &&
                Object.values(value).every((mode) => mode === 'current' || mode === 'legacy')
            );
        case 'pluginConfiguration':
        case 'sanitizeOptions':
            return record(value);
        default:
            return typeof value === 'boolean';
    }
}

/**
 * Validate the finite data-only sanitizer subset without exposing callbacks/parser switches.
 * @param key - Accepted sanitizer setting name.
 * @param value - Present value from a JavaScript caller.
 * @returns Whether the value satisfies the existing data semantics.
 */
export function validSanitizeValue(key: string, value: unknown): boolean {
    switch (key) {
        case 'cssWhiteList':
            return (
                record(value) &&
                Object.values(value).every((allowed) => typeof allowed === 'boolean')
            );
        case 'allowedTags':
            return value === false || strings(value);
        case 'allowedAttributes':
            return (
                value === false ||
                (record(value) &&
                    Object.values(value).every(
                        (items) => Array.isArray(items) && items.every(attribute),
                    ))
            );
        case 'allowedSchemes':
            return typeof value === 'boolean' || strings(value);
        case 'allowedSchemesByTag':
            return typeof value === 'boolean' || stringMap(value);
        case 'allowedSchemesAppliedToAttributes':
            return strings(value);
        case 'allowProtocolRelative':
            return typeof value === 'boolean';
        default:
            return false;
    }
}

/**
 * Validate scoped builtin values while their names remain owned by the canonical registry.
 * @param key - Accepted builtin option name.
 * @param value - Present value from a JavaScript caller.
 * @returns Whether the value satisfies the existing builtin's declared contract.
 */
export function validBuiltinValue(key: string, value: unknown): boolean {
    if (key === 'directiveSyntax')
        return ['disabled', 'enabled', 'only'].some((mode) => mode === value);
    return validOtherBuiltinValue(key, value);
}

function validOtherBuiltinValue(key: string, value: unknown): boolean {
    switch (key) {
        case 'videoUrl':
            return typeof value === 'function';
        case 'fileExtraAttrs':
            return (
                Array.isArray(value) && value.every((pair) => strings(pair) && pair.length === 2)
            );
        case 'contentAudience':
            return value === 'human' || value === 'agent' || value === 'preserve';
        case 'youtube':
        case 'vimeo':
        case 'vine':
        case 'prezi':
        case 'osf':
        case 'yandex':
        case 'vk':
        case 'rutube':
        case 'url':
            return (
                record(value) &&
                ['width', 'height'].every(
                    (dimension) =>
                        typeof value[dimension] === 'number' ||
                        typeof value[dimension] === 'string',
                ) &&
                (key !== 'vine' || typeof value.embed === 'string') &&
                Object.keys(value).every((field) =>
                    ['width', 'height', ...(key === 'vine' ? ['embed'] : [])].includes(field),
                )
            );
        default:
            return typeof value === 'boolean';
    }
}

/**
 * Check an array-valued installation constraint from untyped callers.
 * @param value - Configured IDs.
 * @returns Whether this is an array of strings.
 */
export function validIdList(value: unknown): boolean {
    return strings(value);
}
