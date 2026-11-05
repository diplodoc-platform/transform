import type {CompatibilityPolicy, DeprecationReporter} from '../deprecation-core';
import type {DiagnosticOptions} from '../log-core';

import {
    createCollector,
    createDiagnosticHost,
    createDocumentLogger as createLogger,
    isDocumentLogger,
} from '../log-core';
import {createDeprecationReporter as createReporter} from '../deprecation-core';

// The retained compatibility collector is explicit; roots use fresh document sinks.
const labels = {
    info: () => 'INFO',
    warn: () => 'WARN',
    error: () => 'ERR',
};
const {log, getLogger, warnInScope} = createDiagnosticHost(labels);

/**
 * Create an explicit browser project/build collector.
 * @returns An indexed collector with caller-owned retention.
 */
export function createDiagnosticCollector() {
    return createCollector(labels);
}

/**
 * Create a fresh browser document sink.
 * @param options - Explicit aggregate mirror and embedding logger.
 * @returns A document-local logger.
 */
export function createDocumentLogger(options: DiagnosticOptions = {}) {
    return createLogger(labels, options);
}

function getInvocationLogger(options: DiagnosticOptions) {
    return isDocumentLogger(options.log) ? options.log : createDocumentLogger(options);
}

/**
 * Create a document scope backed by the plain browser diagnostic host.
 * @param options - Embedding logger and feature-specific compatibility policy.
 * @returns Scope-owned diagnostic deduplication with the shared collector.
 */
export function createBrowserReporter(
    options: DiagnosticOptions & {compatibility?: CompatibilityPolicy} = {},
): DeprecationReporter {
    return createReporter({...options, log: getInvocationLogger(options)}, warnInScope);
}

export {log, getLogger};
