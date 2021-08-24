const {bold} = require('chalk');

const {evalExp} = require('./evaluation');
const {tagLine, variable} = require('./lexical');
const log = require('../log');
const {getPreparedLeftContent} = require('./utils');
const {createSourceMapApi, getLineNumber} = require('./sourceMap');

function changeSourceMap({
    firstLineNumber, lastLineNumber, resFirstLineNumber, resLastLineNumber, contentLinesTotal, linesTotal, sourceMap,
}) {
    if (!sourceMap) { return; }

    const {isInlineTag, offsetLines, removeLine} = createSourceMapApi({
        firstLineNumber, lastLineNumber, sourceMap,
    });

    if (isInlineTag || !resFirstLineNumber) { return; }

    const offsetRestLines = contentLinesTotal - (lastLineNumber - firstLineNumber + 1);

    // Move condition's content to the top
    const offsetContentLines = firstLineNumber - resFirstLineNumber;
    offsetLines({
        start: resFirstLineNumber, end: resLastLineNumber - 1, offset: offsetContentLines, withReplace: true,
    });

    // Remove tags
    removeLine(firstLineNumber);
    removeLine(lastLineNumber);

    // Offset the rest lines
    offsetLines({start: lastLineNumber + 1, end: linesTotal, offset: offsetRestLines});
}

function inlineConditions({forTag, vars, content, match, path, lastIndex, sourceMap, linesTotal}) {
    let res = '';
    const firstLineNumber = getLineNumber(content, forTag.startPos);
    const lastLineNumber = getLineNumber(content, lastIndex);

    const forRawLastIndex = forTag.startPos + forTag.forRaw.length;
    const contentLastIndex = match.index;

    const forTemplate = content.substring(forRawLastIndex, contentLastIndex);
    const resFirstLineNumber = getLineNumber(content, forRawLastIndex + 1);
    const resLastLineNumber = getLineNumber(content, contentLastIndex + 1);

    let collection = evalExp(forTag.collectionName, vars);
    if (!collection || !collection.forEach) {
        collection = [];
        log.error(`${bold(forTag.collectionName)} is undefined or not iterable`);
    }

    // eslint-disable-next-line global-require
    const applyLiquid = require('./index');
    let templatedRes = '';
    collection.forEach((item) => {
        const newVars = {...vars, [forTag.variableName]: item};
        templatedRes += applyLiquid(forTemplate, newVars, path).trimRight();
    });
    res += templatedRes;

    const contentLinesTotal = templatedRes.split('\n').length - 1;

    changeSourceMap({
        firstLineNumber,
        lastLineNumber,
        resFirstLineNumber,
        resLastLineNumber,
        linesTotal,
        sourceMap,
        contentLinesTotal,
    });

    const preparedLeftContent = getPreparedLeftContent({
        content,
        tagStartPos: forTag.startPos,
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
    }

    const leftPart = preparedLeftContent + res;

    return {
        result: leftPart + content.substring(lastIndex + shift),
        idx: leftPart.length,
    };
}

function cycles(originInput, vars, path, settings = {}) {
    const {sourceMap} = settings;

    const R_LIQUID = /({%-?([\s\S]*?)-?%})/g;
    const FOR_SYNTAX = new RegExp(`(\\w+)\\s+in\\s+(${variable.source})`);

    let match;
    const tagStack = [];
    let input = originInput;
    let countSkippedInnerTags = 0;
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
            case 'for': {
                if (tagStack.length) {
                    countSkippedInnerTags += 1;
                    break;
                }

                const [variableName, collectionName] = args.match(FOR_SYNTAX).slice(1);
                tagStack.push({
                    item: args,
                    variableName,
                    collectionName,
                    startPos: match.index,
                    forRaw: match[1],
                });
                break;
            }
            case 'endfor': {
                if (countSkippedInnerTags > 0) {
                    countSkippedInnerTags -= 1;
                    break;
                }
                const forTag = tagStack.pop();

                const {idx, result} = inlineConditions({
                    forTag,
                    vars,
                    content: input,
                    match,
                    path,
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
        log.error(`For block must be closed${path ? ` in ${bold(path)}` : ''}`);
    }

    return input;
}

module.exports = cycles;
