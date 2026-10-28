import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {EnvType, Heading, MarkdownIt, ParserEnv} from './typings';

import {parseChildDocumentResult, replayChildDocument} from './document-context';

export {envMeta} from './document-meta';
export type {MetaParser} from './document-meta';

export interface DocumentMeta {
    [name: string]: unknown;
    script?: string[];
    style?: string[];
    csp?: Record<string, string[]>[];
}

export interface DocumentEnv extends ParserEnv {
    title: string;
    headings: Heading[];
    meta?: DocumentMeta;
    assets?: string[];
    included?: Record<string, string>;
}

export interface ParsedDocument {
    readonly tokens: Token[];
    readonly env: DocumentEnv;
}

declare const fragmentBrand: unique symbol;

/** An in-process fragment owned by the configured parser that created it. */
export interface ParsedDocumentFragment {
    readonly tokens: Token[];
    readonly [fragmentBrand]: true;
}

export interface DocumentParser {
    parseDocument(input: string, initialize?: (env: DocumentEnv) => void): ParsedDocument;
    compileDocument(document: ParsedDocument): string;
    parse(input: string): Token[];
    compile(tokens: Token[], document?: ParsedDocument): string;
    readonly env: EnvType;
}

export interface ChildParseOptions {
    purpose: 'include' | 'reference' | 'fragment';
    path?: string;
    disableTitleRefSubstitution?: boolean;
    disableCircularError?: boolean;
}

export {createDocumentEnv} from './document-data';

/**
 * Parse a synchronous child and commit only its purpose's document contributions.
 * @param md - Configured native parser.
 * @param source - Preprocessed child Markdown.
 * @param parentEnv - The enclosing document environment.
 * @param options - Child purpose and source location.
 * @param prepareSource - Optional synchronous preparation inside the child frame.
 * @returns Child tokens for explicit insertion or inspection.
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
 * Parse once and capture only child-owned contributions for same-parser reuse.
 * @param md - Configured native parser owning this fragment.
 * @param source - Child Markdown before optional caller preprocessing.
 * @param parentEnv - Enclosing document environment.
 * @param options - Initial purpose and child source location.
 * @param prepareSource - Synchronous preparation inside the child's active frame.
 * @returns Opaque fragment with the original mutable token array.
 */
export function parseDocumentFragmentResult(
    md: MarkdownIt,
    source: string,
    parentEnv: ParserEnv,
    options: ChildParseOptions,
    prepareSource?: (source: string) => string,
): ParsedDocumentFragment {
    return parseChildDocumentResult(md, source, parentEnv, options, prepareSource);
}

/**
 * Replay captured contributions without parsing, rendering or advancing IDs.
 * @param md - The same configured parser that created the fragment.
 * @param fragment - A genuine in-process fragment handle.
 * @param parentEnv - Current containing document environment.
 * @param options - Contribution purpose; reference commits nothing.
 * @returns No value; validated contributions are committed to the parent.
 */
export function replayDocumentFragment(
    md: MarkdownIt,
    fragment: ParsedDocumentFragment,
    parentEnv: ParserEnv,
    options: Pick<ChildParseOptions, 'purpose'>,
): void {
    replayChildDocument(md, fragment, parentEnv, options);
}

/** A cycle is recoverable by the caller; parsing never terminates the process. */
export class IncludeCycleError extends Error {
    readonly chain: readonly string[];

    constructor(chain: string[]) {
        super(`Circular includes: ${chain.join(' ▶ ')}`);
        this.name = 'IncludeCycleError';
        this.chain = [...chain];
    }
}
