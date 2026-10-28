import type {CompatibilityPolicy, DeprecationReporter} from '../deprecation-core';
import type {LogConsumer} from '../log-core';

import {createDiagnosticHost} from '../log-core';
import {createDeprecationReporter as createReporter} from '../deprecation-core';

// Shared ESM chunks retain one browser collector across both entry points.
const {log, getLogger, warnInScope} = createDiagnosticHost({
    info: () => 'INFO',
    warn: () => 'WARN',
    error: () => 'ERR',
});

/**
 * Create a document scope backed by the plain browser diagnostic host.
 * @param options - Embedding logger and feature-specific compatibility policy.
 * @returns Scope-owned diagnostic deduplication with the shared collector.
 */
export function createBrowserReporter(
    options: {log?: LogConsumer; compatibility?: CompatibilityPolicy} = {},
): DeprecationReporter {
    return createReporter(options, warnInScope);
}

export {log, getLogger};
