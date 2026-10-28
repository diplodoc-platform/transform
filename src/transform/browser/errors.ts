export interface BrowserSourceLocation {
    readonly path: string;
    readonly line: number;
    readonly column: number;
}

export type BrowserUnsupportedFeature = 'include' | 'materialized-include' | 'option' | 'builtin';

/** A synchronous browser capability error, without an attempted host operation. */
export class BrowserUnsupportedFeatureError extends Error {
    readonly code = 'BROWSER_UNSUPPORTED_FEATURE';
    readonly feature: BrowserUnsupportedFeature;
    readonly alternative: string;
    readonly location?: BrowserSourceLocation;
    readonly option?: string;

    constructor(
        feature: BrowserUnsupportedFeature,
        alternative: string,
        location?: BrowserSourceLocation,
        option?: string,
    ) {
        const source = location ? ` at ${location.path}:${location.line}:${location.column}` : '';
        const setting = option ? ` (${option})` : '';
        super(`Unsupported browser feature ${feature}${setting}${source}. ${alternative}`);
        this.name = 'BrowserUnsupportedFeatureError';
        this.feature = feature;
        this.alternative = alternative;
        this.location = location;
        this.option = option;
    }
}
