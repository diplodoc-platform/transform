import type {DiagnosticOptions} from './log-core';
import type {CompatibilityPolicy, DeprecationReporter} from './deprecation-core';

import {createDeprecationReporter as createReporter} from './deprecation-core';
import {forwardDeprecation} from './log-core';
import {getInvocationLogger} from './diagnostic-context';

export type {
    CompatibilityMode,
    CompatibilityPolicy,
    DeprecationCode,
    DeprecationDescriptor,
    DeprecationLocation,
    DeprecationRemoval,
    DeprecationReporter,
    DeprecationUsage,
} from './deprecation-core';

/**
 * Create a document or build scope using the Node diagnostic collector.
 * @param options - Existing logger and feature-specific compatibility choices.
 * @returns A synchronous reporter with scope-owned deduplication.
 */
export function createDeprecationReporter(
    options: DiagnosticOptions & {compatibility?: CompatibilityPolicy} = {},
): DeprecationReporter {
    const logger = getInvocationLogger(options);
    return createReporter(options, (message) => forwardDeprecation(logger, message));
}
