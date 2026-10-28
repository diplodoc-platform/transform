import type {ParserHost} from '../parser-core';
import type {BuiltinPluginId} from '../plugin-ids';
import type {DocumentParser} from '../shared-types';
import type {BrowserOutput, BrowserTransformOptions} from './types';

import {createParser as createSharedParser} from '../parser-core';

import {resolveBrowserOptions} from './options';
import {log} from './diagnostics';

/**
 * Bind both browser entrypoints to the same parser/lifecycle implementation.
 * @param host - Real finite browser host with this entry's selected callbacks.
 * @param available - Actual builtin IDs in this entry's canonical order.
 * @returns Synchronous transform and owned-document parser APIs.
 */
export function createBrowserApi<Options extends BrowserTransformOptions = BrowserTransformOptions>(
    host: ParserHost,
    available: readonly BuiltinPluginId[],
) {
    /**
     * Create a configured synchronous parser with owned document handles.
     * @param options - Supported browser parser and composition settings.
     * @returns Reusable parser sharing the canonical document lifecycle.
     */
    function createParser(options?: Options): DocumentParser {
        return createSharedParser(
            resolveBrowserOptions(options === undefined ? {} : options, available),
            host,
        );
    }

    /**
     * Transform one Markdown root with mandatory final HTML/CSS sanitization.
     * @param source - Markdown after any application-owned host preprocessing.
     * @param options - Supported browser parser and composition settings.
     * @returns Rendered document data and the browser host's collected diagnostics.
     */
    function transform(source: string, options?: Options): BrowserOutput {
        const parser = createParser(options);
        try {
            const document = parser.parseDocument(source);
            const html = parser.compileDocument(document);
            return {result: {...document.env, html}, logs: log.get()};
        } catch (error) {
            log.error('Error occurred');
            throw error;
        }
    }

    return {createParser, transform};
}
