export function createSourceMapApi({
    firstLineNumber,
    lastLineNumber,
    sourceMap,
}: {
    firstLineNumber: number,
    lastLineNumber: number,
    sourceMap: object,
}): object;

export function getLineNumber(input: string, i: number): number;

export function prepareSourceMap(sourceap: object): object;
