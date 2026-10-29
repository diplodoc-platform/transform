import type {ParserHost} from '../parser-core';

import {createSanitizer} from '../sanitize-core';

import {browserCss} from './css';
import {createBrowserReporter, getLogger, log} from './diagnostics';
import {installBrowserGuard} from './guard';

const sanitizers = createSanitizer(browserCss, log);

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
        createReporter: createBrowserReporter,
        ...sanitizers,
    };
}
