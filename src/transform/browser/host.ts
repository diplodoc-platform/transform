import type {ParserHost} from '../parser-core';

import {createSanitizer} from '../sanitize-core';

import {browserCss} from './css';
import {createBrowserReporter, createDocumentLogger, getLogger, log} from './diagnostics';
import {installBrowserGuard} from './guard';

/**
 * Bind existing parser services to real browser implementations.
 * @param defaultPlugins - Actual callbacks selected by this entry's finite preset.
 * @param resolvePlugins - Shared configuration resolver bound to that actual inventory.
 * @param deprecatedBuiltinAdapters - Actual callbacks that support private builtin context.
 * @returns Finite host; no Node preprocessing or alternate parser is installed.
 */
export function createBrowserHost(
    defaultPlugins: ParserHost['defaultPlugins'],
    resolvePlugins: ParserHost['resolvePlugins'],
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
        sanitize: (html, options, additional, logger) =>
            createSanitizer(browserCss, logger ?? log).sanitize(html, options, additional),
        sanitizeStyles: (html, options, logger) =>
            createSanitizer(browserCss, logger ?? log).sanitizeStyles(html, options),
    };
}
