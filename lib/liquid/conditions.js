const {bold} = require('chalk');

const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');
const log = require('../log');
const {getPreparedLeftContent} = require('./utils');
const {createSourceMapApi, getLineNumber} = require('./sourceMap');

function changeSourceMap({
    firstLineNumber, lastLineNumber, resFirstLineNumber, resLastLineNumber, linesTotal, sourceMap,
}) {
    if (!sourceMap) { return; }

    const {isInlineTag, getSourceMapValue, offsetLines, removeLines} = createSourceMapApi({
        firstLineNumber, lastLineNumber, sourceMap,
    });

    if (isInlineTag) { return; }

    let offsetRestLines;
    if (resFirstLineNumber) {
        // Move condition's content to the top
        const offsetContentLines = firstLineNumber - resFirstLineNumber;
        offsetLines({
            start: resFirstLineNumber, end: resLastLineNumber - 1, offset: offsetContentLines, withReplace: true,
        });

        // Remove the rest lines of the condition block
        removeLines({start: firstLineNumber, end: resFirstLineNumber - 1});
        removeLines({start: resLastLineNumber, end: lastLineNumber});

        // Calculate an offset of the rest lines
        offsetRestLines = getSourceMapValue(resLastLineNumber - 1) - lastLineNumber;
    } else {
        // Remove the whole condition block
        removeLines({start: firstLineNumber, end: lastLineNumber});

        // Calculate offset of the rest lines
        offsetRestLines = firstLineNumber - lastLineNumber - 1;
    }

    // Offset the rest lines
    offsetLines({start: lastLineNumber + 1, end: linesTotal, offset: offsetRestLines});
}

const getElseProp = ({elses}, propName, index = 0) => {
    if (!elses.length || index >= elses.length) {
        return undefined;
    }

    return elses[index][propName];
};
function inlineConditions({ifTag, vars, content, match, lastIndex, sourceMap, linesTotal}) {
    let res = '';
    const firstLineNumber = getLineNumber(content, ifTag.startPos);
    const lastLineNumber = getLineNumber(content, lastIndex);
    let resFirstLineNumber;
    let resLastLineNumber;

    if (evalExp(ifTag.condition, vars)) {
        const ifRawLastIndex = ifTag.startPos + ifTag.ifRaw.length;
        const contentLastIndex = getElseProp(ifTag, 'startPos') || match.index;

        res = content.substring(
            ifRawLastIndex,
            contentLastIndex,
        );
        resFirstLineNumber = getLineNumber(content, ifRawLastIndex + 1);
        resLastLineNumber = getLineNumber(content, contentLastIndex + 1);
    } else {
        ifTag.elses.some(({condition, startPos, raw}, index) => {
            const isTruthy = !condition || evalExp(condition, vars);

            if (isTruthy) {
                const elseRawLastIndex = startPos + raw.length;
                const contentLastIndex = getElseProp(ifTag, 'startPos', index + 1) || match.index;

                res = content.substring(elseRawLastIndex, contentLastIndex);
                resFirstLineNumber = getLineNumber(content, elseRawLastIndex + 1);
                resLastLineNumber = getLineNumber(content, contentLastIndex + 1);

                return true;
            }

            return false;
        });
    }

    changeSourceMap({
        firstLineNumber, lastLineNumber, resFirstLineNumber, resLastLineNumber, linesTotal, sourceMap,
    });

    const preparedLeftContent = getPreparedLeftContent({
        content,
        tagStartPos: ifTag.startPos,
        tagContent: res,
    });

    let shift = 0;
    if (res === '' && preparedLeftContent[preparedLeftContent.length - 1] === '\n' && content[lastIndex] === '\n') {
        shift = 1;
    }

    if (res !== '') {
        if (res[0] === ' ' || res[0] === '\n') {
            res = res.substring(1);
        }

        res = res.trimRight();
    }

    const leftPart = preparedLeftContent + res;

    return {
        result: leftPart + content.substring(lastIndex + shift),
        idx: leftPart.length,
    };
}

function conditions(originInput, vars, path, settings = {}) {
    const {sourceMap} = settings;

    const R_LIQUID = /({%-?([\s\S]*?)-?%})/g;

    let match;
    const tagStack = [];
    let input = originInput;
    let linesTotal = originInput.split('\n').length;

    while ((match = R_LIQUID.exec(input)) !== null) {
        if (!match[1]) {
            continue;
        }

        const tagMatch = match[2].trim().match(tagLine);
        if (!tagMatch) {
            continue;
        }

        const [type, args] = tagMatch.slice(1);

        switch (type) {
            case 'if':
                tagStack.push({
                    isOpen: true,
                    condition: args,
                    startPos: match.index,
                    ifRaw: match[1],
                    elses: [],
                });
                break;
            case 'else':
                tagStack[tagStack.length - 1].elses.push({
                    startPos: match.index,
                    raw: match[1],
                });
                break;
            case 'elsif':
                tagStack[tagStack.length - 1].elses.push({
                    condition: args,
                    startPos: match.index,
                    raw: match[1],
                });
                break;
            case 'endif': {
                const ifTag = tagStack.pop();

                const {idx, result} = inlineConditions({
                    ifTag,
                    vars,
                    content: input,
                    match,
                    lastIndex: R_LIQUID.lastIndex,
                    sourceMap,
                    linesTotal,
                });
                R_LIQUID.lastIndex = idx;
                input = result;
                linesTotal = result.split('\n').length;

                break;
            }
        }
    }

    if (tagStack.length !== 0) {
        log.error(`Condition block must be closed${path ? ` in ${bold(path)}` : ''}`);
    }

    return input;
}

module.exports = conditions;
