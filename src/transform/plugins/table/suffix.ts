/** Final legacy attribute suffix, with offsets into the original cell content. */
export interface AlignmentSuffix {
    0: string;
    1: string;
    index: number;
}

/** Find the exact suffix accepted by the legacy class extractor in linear time. */
export function trailingClassBlock(source: string): string | undefined {
    if (!source.endsWith('}')) {
        return undefined;
    }
    const previousClose = source.lastIndexOf('}', source.length - 2);
    const open = source.indexOf('{', previousClose + 1);
    if (open === -1) {
        return undefined;
    }
    let start = open;
    while (start > 0 && /\s/.test(source[start - 1])) {
        start--;
    }
    return source.slice(start);
}

/** Return the original offset before trailing horizontal whitespace. */
export function horizontalEnd(source: string): number {
    let end = source.length;
    while (end > 0 && (source[end - 1] === ' ' || source[end - 1] === '\t')) {
        end--;
    }
    return end;
}

/** Find a final, unnested alignment group without overlapping regex searches. */
export function alignmentSuffix(source: string): AlignmentSuffix | undefined {
    let end = source.length;
    while (end > 0 && /[ \t\n]/.test(source[end - 1])) {
        end--;
    }
    if (source[end - 1] !== '}') {
        return undefined;
    }
    const open = source.lastIndexOf('{', end - 1);
    if (open === -1) {
        return undefined;
    }
    const body = source.slice(open + 1, end - 1);
    if (/[}\n]/.test(body) || !body.includes('cell-align-')) {
        return undefined;
    }
    let start = open;
    while (start > 0 && (source[start - 1] === ' ' || source[start - 1] === '\t')) {
        start--;
    }
    return {0: source.slice(start), 1: body, index: start};
}
