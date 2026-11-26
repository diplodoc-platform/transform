import type {HighlightJsLegacyApi, Highlighter} from '../src/transform/highlighter';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};

import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';

import transform from '../src/transform';
import {createHighlightJsHighlighter} from '../src/transform/highlighter';
import {defineTransformOptions} from '../src/transform/plugin-configuration';

/**
 * Compile-only fixtures for the core and library-independent adapter contracts.
 * @param legacy - Independently typed legacy API; the 10.0.3 archive has no declarations.
 * @returns Values keeping positive and negative fixtures referenced.
 */
export function highlighterTypeFixtures(legacy: HighlightJsLegacyApi) {
    const callback: Highlighter = () => ({html: '', classes: ['custom']});
    const options = defineTransformOptions({core: {highlighter: callback, tokens: true}});
    const tokens: Token[] = transform('', options);
    createHighlightJsHighlighter(hljs, {languages: {javascript}, allowedLanguages: ['js']});
    createHighlightJsHighlighter({default: hljs}, {languages: {javascript}});
    createHighlightJsHighlighter(legacy);
    // @ts-expect-error A Promise is not a synchronous result.
    const asynchronous: Highlighter = async () => ({html: ''});
    // @ts-expect-error A fragment must declare HTML.
    const missingHtml: Highlighter = () => ({classes: []});
    // @ts-expect-error Classes are individual string tokens.
    const invalidClasses: Highlighter = () => ({html: '', classes: [1]});
    // @ts-expect-error Module loading must finish before adapter construction.
    createHighlightJsHighlighter(Promise.resolve(hljs));
    // @ts-expect-error A language factory is not a highlighter module.
    createHighlightJsHighlighter(javascript);
    // @ts-expect-error Grammar callback parameters are inferred from the supplied API.
    createHighlightJsHighlighter(hljs, {languages: {custom: (_api: number) => ({})}});
    // @ts-expect-error Legacy-only structural instances must identify a supported legacy version.
    createHighlightJsHighlighter({
        getLanguage: () => true,
        highlight: (_language: string, _source: string, _ignore: boolean) => ({value: ''}),
    });
    return {tokens, asynchronous, missingHtml, invalidClasses};
}
