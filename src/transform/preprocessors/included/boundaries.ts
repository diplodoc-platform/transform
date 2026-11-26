const INCLUDE_REGEXP = /^\s*{%\s*included\s*\((.+?)\)\s*%}\s*$/;
const INCLUDE_END_REGEXP = /^\s*{% endincluded %}\s*$/;

/**
 * Read a generated-cache opener using the preprocessor's canonical grammar.
 * @param line - An original source line, without its LF delimiter.
 * @returns The authored path-chain key when the line is an opener.
 */
export function includedPathKey(line: string | undefined): string | undefined {
    return line?.match(INCLUDE_REGEXP)?.[1];
}

/**
 * Check a generated-cache close without loading include paths or files.
 * @param line - An original source line, without its LF delimiter.
 * @returns Whether the canonical preprocessor recognizes the close.
 */
export function isIncludedEnd(line: string | undefined): boolean {
    return Boolean(line?.match(INCLUDE_END_REGEXP));
}

export interface IncludedSourceRange {
    readonly startLine: number;
    readonly endLine: number;
    readonly closed: boolean;
}

/**
 * Locate generated cache regions in normalized source, including unclosed tails.
 *
 * The preprocessor recognizes raw lines even inside Markdown code or HTML. These
 * ranges deliberately follow that ownership rather than Markdown block parsing.
 * They are protection ranges, not instructions to resolve or rewrite includes.
 *
 * @param source - Source with normalized LF line endings.
 * @returns Nested ranges with zero-based, end-exclusive line positions.
 */
export function includedSourceRanges(source: string): readonly IncludedSourceRange[] {
    const lines = source.split('\n');
    const pending: number[] = [];
    const ranges: IncludedSourceRange[] = [];
    for (let line = 0; line < lines.length; line++) {
        if (includedPathKey(lines[line])) {
            pending.push(line);
        } else if (isIncludedEnd(lines[line])) {
            const startLine = pending.pop();
            if (startLine !== undefined) {
                ranges.push({startLine, endLine: line + 1, closed: true});
            }
        }
    }
    for (const startLine of pending) {
        ranges.push({startLine, endLine: lines.length, closed: false});
    }
    return ranges.sort((a, b) => a.startLine - b.startLine);
}
