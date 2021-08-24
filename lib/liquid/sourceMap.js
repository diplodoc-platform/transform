const invert = require('lodash/invert');

const DELETED_LINE = '-';

function getLineNumber(input, index) {
    return input.substring(0, index).split('\n').length;
}

function prepareSourceMap(sourceMap) {
    const newToOldMap = invert(sourceMap);
    delete newToOldMap[DELETED_LINE];

    return newToOldMap;
}

function createSourceMapApi({
    firstLineNumber,
    lastLineNumber,
    sourceMap,
}) {
    const isInlineTag = firstLineNumber === lastLineNumber;
    const newToOldIndexes = invert(sourceMap);

    const getOriginIndex = (i) => newToOldIndexes[i];

    const setSourceMapValue = (i, value) => { sourceMap[getOriginIndex(i)] = value; };
    const getSourceMapValue = (i) => sourceMap[getOriginIndex(i)];

    const moveLines = ({start, end, offset, withReplace = false}) => {
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

    const removeLine = (i) => {
        setSourceMapValue(i, DELETED_LINE);
    };

    const removeLines = ({start, end}) => {
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

module.exports = {
    createSourceMapApi,
    getLineNumber,
    prepareSourceMap,
};
