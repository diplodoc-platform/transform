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

type Options = {
    firstLineNumber: number;
    lastLineNumber: number;
    sourceMap: Record<number, number>;
};

type MoveLinesOptions = {
    start: number;
    end: number;
    offset: number;
    withReplace?: boolean;
};

export function createSourceMapApi({firstLineNumber, lastLineNumber, sourceMap}: Options) {
    const isInlineTag = firstLineNumber === lastLineNumber;
    const newToOldIndexes = invert(sourceMap);

    const getOriginIndex = (i: number) => Number(newToOldIndexes[i]);

    const setSourceMapValue = (i: number, value: number) => {
        sourceMap[getOriginIndex(i)] = value;
    };
    const getSourceMapValue = (i: number) => sourceMap[getOriginIndex(i)];

    const moveLines = ({start, end, offset, withReplace = false}: MoveLinesOptions) => {
        if (isInlineTag) {
            return;
        }

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
        isInlineTag,
        getSourceMapValue,
        moveLines,
        removeLines,
        removeLine,
    };
}
