import type {HighlightLangMap} from './typings';
import type {HighlightJsApi, Highlighter} from './highlighter';
import type {LogConsumer} from './log';

import {createDeprecationReporter} from './deprecation';
import {createHighlightJsHighlighter} from './highlighter';
import {renderHighlight} from './highlighter/renderer';

/**
 * Explicit compatibility opt-in to loading the full optional Highlight.js peer.
 * @param languages - Legacy grammar factories registered on the peer instance.
 * @param scope - Caller-owned logger scope for the migration warning.
 * @returns The old highlighted output, or escaped plain code when the peer is absent.
 * @deprecated Load the instance externally and use createHighlightJsHighlighter. Removal: Transform 6.
 */
export function createLegacyHighlighter(
    languages: HighlightLangMap = {},
    scope: {log?: LogConsumer} = {},
): Highlighter {
    createDeprecationReporter(scope).warn(
        {
            code: 'LEGACY_HIGHLIGHTER_FACTORY',
            feature: 'Implicit peer loading through the legacy highlighter factory',
            replacement:
                'an explicit Highlight.js import and createHighlightJsHighlighter(instance, {languages})',
            removal: {version: '6.0.0'},
        },
        {option: 'createLegacyHighlighter'},
    );
    let instance: HighlightJsApi;
    try {
        instance = require('highlight.js');
    } catch (error) {
        if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'MODULE_NOT_FOUND' &&
            error.message.startsWith("Cannot find module 'highlight.js'")
        ) {
            return () => undefined;
        }
        throw error;
    }
    const highlighter = createHighlightJsHighlighter(instance);
    for (const [name, factory] of Object.entries(languages)) {
        highlighter.registerLanguage?.(name, factory);
    }
    return highlighter;
}

/**
 * Retain the old MarkdownIt callback shape for explicit compatibility imports.
 * @param languages - Legacy grammar factories.
 * @param scope - Caller-owned logger scope.
 * @returns A synchronous MarkdownIt highlighting callback.
 * @deprecated Use an explicit highlighter. Removal: Transform 6.
 */
export default function makeHighlight(
    languages: HighlightLangMap = {},
    scope: {log?: LogConsumer} = {},
) {
    return renderHighlight(createLegacyHighlighter(languages, scope));
}
