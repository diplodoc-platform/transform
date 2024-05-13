import invert from 'lodash/invert';

const DELETED_LINE = Number.MIN_SAFE_INTEGER;

export function getLineNumber(input: string, index: number) {
    return input.substring(0, index).split('\n').length;
}

export function prepareSourceMap(sourceMap: object) {
    const newToOldMap = invert(sourceMap);
    delete newToOldMap[DELETED_LINE];

    return newToOldMap;
}

type MoveLinesOptions = {
    start: number;
    end: number;
    offset: number;
    withReplace?: boolean;
};

export type SourceMapApi = ReturnType<typeof createSourceMapApi>;

export function createSourceMapApi(sourceMap: Record<number, number>) {
    const newToOldIndexes = invert(sourceMap);

    const getOriginIndex = (i: number) => Number(newToOldIndexes[i]);

    const setSourceMapValue = (i: number, value: number) => {
        sourceMap[getOriginIndex(i)] = value;
    };
    const getSourceMapValue = (i: number) => sourceMap[getOriginIndex(i)];

    const moveLines = ({start, end, offset, withReplace = false}: MoveLinesOptions) => {
        for (let i = start; i <= end; i++) {
            const newLineNumber = i + offset;
            setSourceMapValue(i, newLineNumber);

            if (withReplace) {
                setSourceMapValue(newLineNumber, DELETED_LINE);
            }
        }
    };

    const removeLine = (i: number) => {
        setSourceMapValue(i, DELETED_LINE);
    };

    const removeLines = ({start, end}: {start: number; end: number}) => {
        for (let i = start; i <= end; i++) {
            removeLine(i);
        }
    };

    return {
        getSourceMapValue,
        moveLines,
        removeLines,
        removeLine,
    };
}
