import type {HighlightLanguageFactory} from './shared-types';

import {escapeHtml} from './markdown-it-utils';

export interface HighlightResult {
    /** An HTML fragment inside code, without a pre/code wrapper. */
    readonly html: string;
    /** Individual CSS class tokens, escaped at the attribute boundary. */
    readonly classes?: readonly string[];
}

export interface Highlighter {
    (source: string, language: string): HighlightResult | undefined;
    /** @deprecated Pass languages to createHighlightJsHighlighter. Removal: Transform 6. */
    registerLanguage?: (name: string, factory: HighlightLanguageFactory) => void;
}

export interface HighlightJsModernApi {
    readonly versionString?: string;
    getLanguage(name: string): unknown;
    highlight(
        source: string,
        options: {language: string; ignoreIllegals: boolean},
    ): {value: string};
}

export interface HighlightJsLegacyApi {
    /** Validated at construction; published 10.x declarations use a broad string. */
    readonly versionString: string;
    getLanguage(name: string): unknown;
    highlight(language: string, source: string, ignoreIllegals: boolean): {value: string};
}

export type HighlightJsApi = HighlightJsModernApi | HighlightJsLegacyApi;

export type HighlightJsLanguage<Api> = Api extends {
    registerLanguage(name: string, factory: infer Factory): void;
}
    ? Factory
    : never;

export interface HighlightJsOptions<Api> {
    readonly languages?: Readonly<Record<string, HighlightJsLanguage<Api>>>;
    readonly allowedLanguages?: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

function isInstance(value: unknown): value is HighlightJsApi {
    return (
        isRecord(value) &&
        typeof value.getLanguage === 'function' &&
        typeof value.highlight === 'function'
    );
}

function normalizeInstance(value: unknown): HighlightJsApi {
    if (isInstance(value)) {
        return value;
    }
    if (isRecord(value) && isInstance(value.default)) {
        return value.default;
    }
    throw new TypeError(
        'Expected a Highlight.js instance with getLanguage and highlight methods, or {default: instance}; await imports before creating the highlighter',
    );
}

function usesLegacyCall(instance: HighlightJsApi): boolean {
    const {versionString} = instance;
    if (versionString === undefined) {
        return false;
    }
    const version =
        typeof versionString === 'string' && /^(10|11)\.(\d+)\.(\d+)$/.exec(versionString);
    if (!version) {
        throw new TypeError(
            'Expected Highlight.js versionString in the supported 10.x or 11.x range',
        );
    }
    return version[1] === '10' && Number(version[2]) < 7;
}

/**
 * Adapt an explicitly loaded Highlight.js instance; this module never loads the optional peer.
 * @param module - A direct instance or a namespace containing its default export.
 * @param options - Explicit grammar registration and optional fence-language selection.
 * @returns A synchronous highlighter bound to the supplied instance.
 */
export function createHighlightJsHighlighter<Api extends HighlightJsApi>(
    module: Api | {readonly default: Api},
    options: HighlightJsOptions<Api> = {},
): Highlighter {
    const instance = normalizeInstance(module);
    const legacy = usesLegacyCall(instance);
    if (
        options.allowedLanguages !== undefined &&
        (!Array.isArray(options.allowedLanguages) ||
            options.allowedLanguages.some((name) => typeof name !== 'string'))
    ) {
        throw new TypeError('allowedLanguages must be an array of language identifiers');
    }
    const allowed =
        options.allowedLanguages === undefined ? undefined : new Set(options.allowedLanguages);
    const register = (name: string, factory: unknown) => {
        const method = (instance as unknown as Record<string, unknown>).registerLanguage;
        if (typeof method !== 'function' || typeof factory !== 'function') {
            throw new TypeError(
                'Highlight.js grammar registration requires registerLanguage and a language factory function',
            );
        }
        Reflect.apply(method, instance, [name, factory]);
    };

    for (const [name, factory] of Object.entries(options.languages || {})) {
        register(name, factory);
    }

    const highlighter: Highlighter = (source, language) => {
        const classes = ['hljs'];
        if (!language || (allowed && !allowed.has(language)) || !instance.getLanguage(language)) {
            return {html: escapeHtml(source), classes};
        }
        classes.push(language);
        let result: unknown;
        try {
            result = legacy
                ? (instance as HighlightJsLegacyApi).highlight(language, source, true)
                : (instance as HighlightJsModernApi).highlight(source, {
                      language,
                      ignoreIllegals: true,
                  });
        } catch {
            return {html: escapeHtml(source), classes};
        }
        if (!isRecord(result) || typeof result.value !== 'string') {
            throw new TypeError('Highlight.js highlight must return an object with a string value');
        }
        return {html: result.value, classes};
    };
    highlighter.registerLanguage = register;
    return highlighter;
}
