import type {DiagnosticOptions} from './log-core';

import {green, red, yellow} from 'chalk';

import {createCollector, createDocumentLogger as createLogger, isDocumentLogger} from './log-core';

export const diagnosticLabels = {
    info: () => green('INFO'),
    warn: () => yellow('WARN'),
    error: () => red('ERR'),
};
const labels = diagnosticLabels;

/**
 * Create an explicit project/build collector with detached snapshots.
 * @returns An indexed collector with caller-owned retention.
 */
export function createDiagnosticCollector() {
    return createCollector(labels);
}

/**
 * Create a fresh Node document diagnostic sink.
 * @param options - Explicit aggregate mirror and external logger.
 * @returns A document-local logger.
 */
export function createDocumentLogger(options: DiagnosticOptions = {}) {
    return createLogger(labels, options);
}

/**
 * Reuse an enclosing document sink or create a standalone invocation sink.
 * @param options - Existing logger and optional aggregate mirror.
 * @returns The selected invocation logger.
 */
export function getInvocationLogger(options: DiagnosticOptions = {}) {
    return isDocumentLogger(options.log) ? options.log : createDocumentLogger(options);
}
