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
        if (isInlineTag || !offset) {
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

function changeSourceMap({
    firstLineNumber, lastLineNumber, linesTotal, sourceMap, content, resFirstLineNumber, resLastLineNumber,
}) {
    if (!sourceMap) {
        return;
    }

    const {isInlineTag, moveLines, removeLine, removeLines} = createSourceMapApi({
        firstLineNumber, lastLineNumber, sourceMap,
    });

    if (isInlineTag) {
        return;
    }

    // Move condition's content to the top
    const offsetContentLines = firstLineNumber - resFirstLineNumber;
    moveLines({
        start: resFirstLineNumber, end: resLastLineNumber, offset: offsetContentLines, withReplace: true,
    });

    if (!content) {
        removeLines({start: firstLineNumber, end: lastLineNumber});
    }

    // Remove tags
    removeLine(firstLineNumber);
    removeLine(lastLineNumber);

    // Offset the rest lines
    const contentLinesTotal = content ? content.split('\n').length : 0;
    const offsetRestLines = firstLineNumber - lastLineNumber + contentLinesTotal - 1;
    moveLines({start: lastLineNumber + 1, end: linesTotal, offset: offsetRestLines});
}

/* Find the deleted lines in the source map of the recursive liquid call and
delete these lines in the source map of the current liquid call */
function applySubSourceMap({
    firstLineNumber, sourceMap, subSourceMap, subContent,
}) {
    if (!sourceMap) {
        return;
    }

    const oldToNewLineSourceMap = invert(subSourceMap);
    const forTemplateLinesCount = subContent.split('\n').length;

    for (let lineNumber = 1; lineNumber <= forTemplateLinesCount; lineNumber++) {
        if (!oldToNewLineSourceMap[lineNumber]) {
            const offset = firstLineNumber - 1;
            const sourceMapIndex = lineNumber + offset;
            delete sourceMap[sourceMapIndex];
        }
    }
}

module.exports = {
    changeSourceMap,
    applySubSourceMap,
    createSourceMapApi,
    getLineNumber,
    prepareSourceMap,
};
