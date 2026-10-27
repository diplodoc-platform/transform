import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {EnvType, Heading, MarkdownIt, ParserEnv} from './typings';

import {parseChildDocument} from './document-context';

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

/**
 * Create plain document data; rules and parser services remain caller-owned.
 * @returns Fresh mutable environment, without installed parser rules.
 */
export function createDocumentEnv(): DocumentEnv {
    // Preserve ordinary Transform result keys even when their features are disabled.
    const env: DocumentEnv = {meta: undefined, assets: undefined, headings: [], title: ''};
    Object.defineProperty(env, 'included', {value: {}, writable: true, configurable: true});
    return env;
}

/**
 * Parse a synchronous child and commit only its purpose's document contributions.
 * @param md - Configured native parser.
 * @param source - Preprocessed child Markdown.
 * @param parentEnv - The enclosing document environment.
 * @param options - Child purpose and source location.
 * @returns Child tokens for explicit insertion or inspection.
 */
export function parseDocumentFragment(
    md: MarkdownIt,
    source: string,
    parentEnv: ParserEnv,
    options: ChildParseOptions,
): Token[] {
    return parseChildDocument(md, source, parentEnv, options);
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
