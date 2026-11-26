import type {ParserHost} from '../parser-core';

import {createBrowserReporter, createDocumentLogger, getLogger} from './diagnostics';
import {installBrowserGuard} from './guard';

/**
 * Bind existing parser services to real browser implementations.
 * @param defaultPlugins - Actual callbacks selected by this entry's finite preset.
 * @param resolvePlugins - Shared configuration resolver bound to that actual inventory.
 * @param sanitize - Final HTML processing selected by the entry.
 * @param deprecatedBuiltinAdapters - Actual callbacks that support private builtin context.
 * @returns Finite host; no Node preprocessing or alternate parser is installed.
 */
export function createBrowserHost(
    defaultPlugins: ParserHost['defaultPlugins'],
    resolvePlugins: ParserHost['resolvePlugins'],
    sanitize: ParserHost['sanitize'],
    deprecatedBuiltinAdapters?: ParserHost['deprecatedBuiltinAdapters'],
): ParserHost {
    return {
        defaultPlugins,
        deprecatedBuiltinAdapters,
        resolvePlugins,
        installGuard: installBrowserGuard,
        preprocess: (source) => source,
        getLogger,
        createLogger: createDocumentLogger,
        createReporter: createBrowserReporter,
        sanitize,
    };
}
