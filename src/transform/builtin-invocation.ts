import type {MarkdownIt, MarkdownItPluginOpts} from './typings';

import {findDocumentContext} from './document-context-core';

// The marker belongs to one installation and is never forwarded to the extension.
const builtin = Symbol('builtin installation');

type MarkedOptions<T> = T & {[builtin]?: unknown};

export function builtinOptions(
    options: MarkdownItPluginOpts,
    plugin: unknown,
): MarkdownItPluginOpts {
    const marked: MarkedOptions<MarkdownItPluginOpts> = {...options, [builtin]: plugin};
    return marked;
}

export function unwrapBuiltin<T extends object>(
    options: MarkedOptions<T> | undefined,
    plugin: unknown,
) {
    if (!options || options[builtin] !== plugin) {
        return {options, automatic: false};
    }
    const {[builtin]: _marker, ...rest} = options;
    return {options: rest, automatic: true};
}

/** Default for automatically selected block owners; direct callbacks remain disabled. */
export const builtinDirectiveDefault = 'enabled' as const;

export function directiveMode(value: unknown, automatic: boolean): 'disabled' | 'enabled' | 'only' {
    if (value === undefined) return automatic ? builtinDirectiveDefault : 'disabled';
    if (value === 'disabled' || value === 'enabled' || value === 'only') return value;
    throw new Error('Invalid directiveSyntax');
}

export function reportDirectiveDiagnostic(
    md: MarkdownIt,
    context: {path?: string; log?: {warn(message: string): void}} | undefined,
    owner: string,
    diagnostic: {line: number; reason: string},
): void {
    const activePath = findDocumentContext(md)?.current?.path;
    const path = typeof activePath === 'string' && activePath ? activePath : context?.path;
    context?.log?.warn(
        `Invalid ${owner} directive at line ${diagnostic.line}${path ? ` in ${path}` : ''}: ${diagnostic.reason}`,
    );
}
