import type {CompatibilityPolicy, DeprecationReporter} from './deprecation';
import type {LogConsumer} from './log';

import {createDeprecationReporter} from './deprecation';

/** Optional diagnostics for retained bundled engine calls. */
export interface LegacyEngineDiagnostics {
    log?: LogConsumer;
    compatibility?: CompatibilityPolicy;
    deprecations?: DeprecationReporter;
}

/**
 * Report an actual bundled engine invocation in the caller's scope.
 * @param engine - Invoked bundled engine.
 * @param path - Source path, when known.
 * @param diagnostics - Caller logger, policy and optional shared scope.
 * @returns Nothing.
 */
export function warnBundledEngine(
    engine: 'Liquid' | 'YFMLint',
    path: string | undefined,
    diagnostics: LegacyEngineDiagnostics = {},
): void {
    const reporter = diagnostics.deprecations ?? createDeprecationReporter(diagnostics);
    const liquid = engine === 'Liquid';
    reporter.warn(
        {
            code: liquid ? 'TRANSFORM_BUNDLED_LIQUID' : 'TRANSFORM_BUNDLED_YFMLINT',
            feature: `Transform bundled ${engine} engine`,
            replacement: liquid
                ? '@diplodoc/liquid in the caller pipeline; bypass bundled processing after preprocessing'
                : '@diplodoc/yfmlint in the caller lint pipeline',
            removal: {
                version: '6.0.0',
            },
        },
        {
            ...(path ? {location: {path}} : {}),
            option: liquid ? 'bundledLiquid' : 'bundledYfmlint',
        },
    );
}
