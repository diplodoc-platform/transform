import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {
    ChildParseOptions,
    MarkdownIt,
    ParsedDocumentFragment,
    ParserEnv,
} from '../shared-types';

import {
    findDocumentContext,
    installDocumentContext,
    parseChildDocumentResult,
    replayChildDocument,
} from '../document-context-core';

import {createBrowserReporter} from './diagnostics';

export {createDocumentEnv} from '../document-data';
export {envMeta} from '../document-meta';

/**
 * Parse one child using the canonical context and browser diagnostic host.
 * @param md - Configured native parser owning the child.
 * @param source - Child Markdown before optional preparation.
 * @param parentEnv - Enclosing document environment.
 * @param options - Child purpose and diagnostic source label.
 * @param prepareSource - Synchronous preparation within the child's frame.
 * @returns Original mutable child tokens.
 */
export function parseDocumentFragment(
    md: MarkdownIt,
    source: string,
    parentEnv: ParserEnv,
    options: ChildParseOptions,
    prepareSource?: (source: string) => string,
): Token[] {
    return parseDocumentFragmentResult(md, source, parentEnv, options, prepareSource).tokens;
}

/**
 * Capture a child with the one canonical same-parser capsule store.
 * @param md - Configured native parser owning the capsule.
 * @param source - Child Markdown before optional preparation.
 * @param parentEnv - Enclosing document environment.
 * @param options - Child purpose and diagnostic source label.
 * @param prepareSource - Synchronous preparation within the child's frame.
 * @returns Genuine fragment capsule; reference purpose commits nothing.
 */
export function parseDocumentFragmentResult(
    md: MarkdownIt,
    source: string,
    parentEnv: ParserEnv,
    options: ChildParseOptions,
    prepareSource?: (source: string) => string,
): ParsedDocumentFragment {
    if (!findDocumentContext(md)) {
        installDocumentContext(md, createBrowserReporter());
    }
    return parseChildDocumentResult(md, source, parentEnv, options, prepareSource);
}

/**
 * Replay captured contributions without parsing or advancing caller IDs.
 * @param md - The native parser that created the capsule.
 * @param fragment - Genuine fragment from the selected browser graph.
 * @param parentEnv - Current enclosing document environment.
 * @param options - Contribution purpose.
 * @returns Nothing; validated finite contributions merge atomically.
 */
export function replayDocumentFragment(
    md: MarkdownIt,
    fragment: ParsedDocumentFragment,
    parentEnv: ParserEnv,
    options: Pick<ChildParseOptions, 'purpose'>,
): void {
    replayChildDocument(md, fragment, parentEnv, options);
}
