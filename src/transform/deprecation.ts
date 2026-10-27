import type {LogConsumer} from './log';

import {warnInScope} from './log';

/** Stable identifiers belong to a feature's migration contract, not its message text. */
export type DeprecationCode = string;

/** A feature-specific choice; this does not change parser defaults by itself. */
export type CompatibilityMode = 'current' | 'legacy';

/** No wildcard: every compatibility exception must name its deprecation code. */
export type CompatibilityPolicy = Readonly<Record<DeprecationCode, CompatibilityMode>>;

export type DeprecationRemoval =
    | {readonly version: string; readonly date?: string}
    | {readonly version?: string; readonly date: string};

export interface DeprecationDescriptor {
    readonly code: DeprecationCode;
    readonly feature: string;
    readonly replacement: string;
    readonly removal: DeprecationRemoval;
}

export interface DeprecationLocation {
    readonly path: string;
    /** One-based source coordinates, when available. */
    readonly line?: number;
    readonly column?: number;
}

/** A warning must identify either a source occurrence or a configuration option. */
export type DeprecationUsage =
    | {readonly location: DeprecationLocation; readonly option?: string}
    | {readonly location?: DeprecationLocation; readonly option: string};

export interface DeprecationReporter {
    /** Report actual usage once per code and occurrence within this scope. */
    warn(descriptor: DeprecationDescriptor, usage: DeprecationUsage): void;
    /** Forget only this scope's occurrences, without clearing collected diagnostics. */
    reset(): void;
    /** Read policy; the feature implementing the migration owns its behavior. */
    compatibility(code: DeprecationCode): CompatibilityMode;
}

function requireText(value: string | undefined, field: string): asserts value is string {
    if (!value?.trim()) {
        throw new TypeError(`Deprecation ${field} must not be empty`);
    }
}

function formatWarning(descriptor: DeprecationDescriptor, usage: DeprecationUsage): string {
    const {code, feature, replacement, removal} = descriptor;
    const {location, option} = usage;

    requireText(code, 'code');
    requireText(feature, 'feature');
    requireText(replacement, 'replacement');
    requireText(removal.version || removal.date, 'removal version or date');
    requireText(location?.path || option, 'location or option');

    const source = location
        ? [location.path, location.line, location.column]
              .filter((part) => part !== undefined)
              .join(':')
        : '';
    const occurrence = [source, option ? `option "${option}"` : ''].filter(Boolean).join(', ');
    const target = [
        removal.version ? `version ${removal.version}` : '',
        removal.date ? `date ${removal.date}` : '',
    ]
        .filter(Boolean)
        .join(', ');

    return `[DEPRECATED ${code}] ${feature} at ${occurrence}. Use ${replacement}. Removal: ${target}.`;
}

/**
 * Create an explicit document or build scope for deprecation diagnostics.
 *
 * @param options - Existing logger and feature-specific compatibility choices.
 * @returns A synchronous reporter whose deduplication state belongs only to this scope.
 */
export function createDeprecationReporter(
    options: {log?: LogConsumer; compatibility?: CompatibilityPolicy} = {},
): DeprecationReporter {
    const seen = new Set<string>();
    const compatibility = {...options.compatibility};

    return {
        warn(descriptor, usage) {
            const message = formatWarning(descriptor, usage);
            const key = JSON.stringify([
                descriptor.code,
                usage.location?.path,
                usage.location?.line,
                usage.location?.column,
                usage.option,
            ]);

            if (seen.has(key)) {
                return;
            }

            warnInScope(message, options.log);
            seen.add(key);
        },
        reset() {
            seen.clear();
        },
        compatibility(code) {
            return Object.prototype.hasOwnProperty.call(compatibility, code)
                ? compatibility[code]
                : 'current';
        },
    };
}
