import type {ChildParseOptions} from './document';
import type {DeprecationReporter} from './deprecation';
import type {MarkdownIt, ParserEnv} from './typings';

import * as context from './document-context-core';
import {createDeprecationReporter} from './deprecation';

export {
    createLegacyEnvView,
    nextCheckboxId,
    normalizeDocumentResources,
    replayChildDocument,
} from './document-context-core';

// Bare native parsers retain the Node diagnostic fallback; configured parsers reuse their host.
export function installDocumentContext(md: MarkdownIt, reporter?: DeprecationReporter) {
    return (
        context.findDocumentContext(md) ??
        context.installDocumentContext(md, reporter ?? createDeprecationReporter())
    );
}

export function initializeDocumentField(md: MarkdownIt, field: 'meta' | 'assets') {
    installDocumentContext(md);
    return context.initializeDocumentField(md, field);
}

export function resetPendingDocument(md: MarkdownIt) {
    installDocumentContext(md);
    return context.resetPendingDocument(md);
}

export function getDocumentEnv(md: MarkdownIt): ParserEnv {
    installDocumentContext(md);
    return context.getDocumentEnv(md);
}

export function withDocumentEnv<T>(md: MarkdownIt, env: ParserEnv, action: () => T): T {
    installDocumentContext(md);
    return context.withDocumentEnv(md, env, action);
}

export function parseChildDocumentResult(
    md: MarkdownIt,
    source: string,
    parent: ParserEnv,
    options: ChildParseOptions,
    prepare?: (source: string) => string,
) {
    installDocumentContext(md);
    return context.parseChildDocumentResult(md, source, parent, options, prepare);
}

export function parseChildDocument(
    md: MarkdownIt,
    source: string,
    parent: ParserEnv,
    options: ChildParseOptions,
    prepare?: (source: string) => string,
) {
    return parseChildDocumentResult(md, source, parent, options, prepare).tokens;
}
