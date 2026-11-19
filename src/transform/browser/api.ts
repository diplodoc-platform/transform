import type {ParserHost} from '../parser-core';
import type {Logger} from '../log-core';
import type {DocumentParser} from '../shared-types';
import type {BrowserParserConfiguration} from './options';
import type {BrowserOutput, BrowserTransformOptions} from './types';

import {createParser as createSharedParser} from '../parser-core';

import {createDocumentLogger} from './diagnostics';

/**
 * Bind both browser entrypoints to the same parser/lifecycle implementation.
 * @param host - Real finite browser host with this entry's selected callbacks.
 * @param resolveOptions - Validator and policy selection for this browser entry.
 * @returns Synchronous transform and owned-document parser APIs.
 */
export function createBrowserApi<Options extends BrowserTransformOptions>(
    host: ParserHost,
    resolveOptions: (options?: Options) => BrowserParserConfiguration,
) {
    function startParser({options, sanitize}: BrowserParserConfiguration, logger?: Logger) {
        const parserHost = sanitize ? {...host, sanitize} : host;
        return createSharedParser(options, parserHost, undefined, logger);
    }

    /**
     * Create a configured synchronous parser with owned document handles.
     * @param options - Supported browser parser and composition settings.
     * @returns Reusable parser sharing the canonical document lifecycle.
     */
    function createParser(options?: Options): DocumentParser {
        return startParser(resolveOptions(options));
    }

    /**
     * Transform one Markdown root with mandatory final HTML/CSS sanitization.
     * @param source - Markdown after any application-owned host preprocessing.
     * @param options - Supported browser parser and composition settings.
     * @returns Rendered document data and the browser host's collected diagnostics.
     */
    function transform(source: string, options?: Options): BrowserOutput {
        const configuration = resolveOptions(options);
        const logger = createDocumentLogger(configuration.options);
        try {
            const parser = startParser(configuration, logger);
            const document = parser.parseDocument(source);
            const html = parser.compileDocument(document);
            return {result: {...document.env, html}, logs: logger.get()};
        } catch (error) {
            logger.error('Error occurred');
            throw error;
        }
    }

    return {createParser, transform};
}
