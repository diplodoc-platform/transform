import type {LogConsumer} from './log';
import type {CompatibilityPolicy, DeprecationReporter} from './deprecation-core';

import {createDeprecationReporter as createReporter} from './deprecation-core';
import {warnInScope} from './log';

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
    options: {log?: LogConsumer; compatibility?: CompatibilityPolicy} = {},
): DeprecationReporter {
    return createReporter(options, warnInScope);
}
