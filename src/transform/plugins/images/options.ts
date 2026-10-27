/** Public SVG inlining settings. Omitted fields retain Transform's defaults. */
export interface SvgInlineOptions {
    enabled?: boolean;
    maxFileSize?: number;
}

/**
 * Resolve current and legacy SVG settings without changing caller-owned configuration.
 *
 * @param options - Explicit SVG settings before or after Transform's default injection.
 * @returns Complete settings; an explicit modern enabled value always wins.
 */
export function normalizeSvgInline(options: {
    inlineSvg?: boolean;
    svgInline?: SvgInlineOptions;
}): Required<SvgInlineOptions> {
    return {
        ...options.svgInline,
        enabled: options.svgInline?.enabled ?? options.inlineSvg ?? true,
        maxFileSize: options.svgInline?.maxFileSize ?? 2 * 1024 * 1024,
    };
}
