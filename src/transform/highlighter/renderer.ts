import type {Highlighter} from '../highlighter';
import type {HighlightLangMap, OptionsType} from '../typings';
import type {DeprecationDescriptor, DeprecationReporter} from '../deprecation';

import {escapeHtml} from '../markdown-it-utils';

const legacyLanguages: DeprecationDescriptor = {
    code: 'HIGHLIGHT_LANGS',
    feature: 'highlightLangs grammar registration',
    replacement: 'createHighlightJsHighlighter(instance, {languages})',
    removal: {version: '6.0.0'},
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

/**
 * Convert a structural callback into MarkdownIt's synchronous wrapper protocol.
 * @param highlighter - Explicit callback, or plain escaped output when absent.
 * @returns A synchronous MarkdownIt highlighting callback.
 */
export function renderHighlight(highlighter?: Highlighter) {
    if (highlighter !== undefined && typeof highlighter !== 'function') {
        throw new TypeError(
            'highlighter must be a synchronous function; await imports before transform',
        );
    }
    return (source: string, language: string): string => {
        const result = highlighter?.(source, language);
        if (result === undefined) {
            return escapeHtml(source);
        }
        if (
            !isRecord(result) ||
            'then' in result ||
            typeof result.html !== 'string' ||
            (result.classes !== undefined &&
                (!Array.isArray(result.classes) ||
                    result.classes.some(
                        (name: unknown) => typeof name !== 'string' || !name || /\s/.test(name),
                    )))
        ) {
            throw new TypeError(
                'highlighter must return {html: string, classes?: string[]} or undefined; async results are unsupported',
            );
        }
        const classes = result.classes?.length
            ? ` class="${result.classes.map(escapeHtml).join(' ')}"`
            : '';
        return `<pre><code${classes}>${result.html}</code></pre>`;
    };
}

/**
 * Preserve legacy grammar registration only with an explicitly supplied implementation.
 * @param options - Transform options with the explicit callback and optional legacy grammars.
 * @param reporter - This parser's deprecation scope.
 * @returns A synchronous MarkdownIt highlighting callback.
 */
export function configureHighlighter(options: OptionsType, reporter: DeprecationReporter) {
    const {highlighter, highlightLangs} = options;
    const render = renderHighlight(highlighter);
    const languages: HighlightLangMap = highlightLangs || {};
    if (Object.keys(languages).length) {
        if (typeof highlighter?.registerLanguage !== 'function') {
            throw new TypeError(
                'highlightLangs requires an explicit highlighter: use createHighlightJsHighlighter(instance, {languages}) or import createLegacyHighlighter from @diplodoc/transform/highlighter/legacy',
            );
        }
        for (const [name, factory] of Object.entries(languages)) {
            highlighter.registerLanguage(name, factory);
        }
        reporter.warn(legacyLanguages, {
            option: 'highlightLangs',
            ...(options.path ? {location: {path: options.path}} : {}),
        });
    }
    return render;
}
