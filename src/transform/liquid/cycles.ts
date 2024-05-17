import {bold} from 'chalk';

import {evalExp} from './evaluation';
import {tagLine, variable} from './lexical';
import {log} from '../log';
import {getPreparedLeftContent} from './utils';
import {createSourceMapApi, getLineNumber} from './sourceMap';
import applyLiquid from './index';

type Options = {
    firstLineNumber: number;
    lastLineNumber: number;
    resFirstLineNumber: number;
    resLastLineNumber: number;
    contentLinesTotal: number;
    linesTotal: number;
    sourceMap: Record<number, number>;
};

function changeSourceMap({
    firstLineNumber,
    lastLineNumber,
    resFirstLineNumber,
    resLastLineNumber,
    contentLinesTotal,
    linesTotal,
    sourceMap,
}: Options) {
    if (!sourceMap) {
        return;
    }

    const {isInlineTag, moveLines, removeLine} = createSourceMapApi({
        firstLineNumber,
        lastLineNumber,
        sourceMap,
    });

    if (isInlineTag || !resFirstLineNumber) {
        return;
    }

    const offsetRestLines = contentLinesTotal - (lastLineNumber - firstLineNumber + 1);

    // Move condition's content to the top
    const offsetContentLines = firstLineNumber - resFirstLineNumber;
    moveLines({
        start: resFirstLineNumber,
        end: resLastLineNumber - 1,
        offset: offsetContentLines,
        withReplace: true,
    });

    // Remove tags
    removeLine(firstLineNumber);
    removeLine(lastLineNumber);

    // Offset the rest lines
    moveLines({start: lastLineNumber + 1, end: linesTotal, offset: offsetRestLines});
}

type Args2 = {
    forTag: Tag;
    vars: Record<string, unknown>;
    content: string;
    match: RegExpExecArray;
    path?: string;
    lastIndex: number;
    sourceMap: Record<number, number>;
    linesTotal: number;
};

function inlineConditions({
    forTag,
    vars,
    content,
    match,
    path,
    lastIndex,
    sourceMap,
    linesTotal,
}: Args2) {
    let res = '';
    const firstLineNumber = getLineNumber(content, forTag.startPos);
    const lastLineNumber = getLineNumber(content, lastIndex);

    const forRawLastIndex = forTag.startPos + forTag.forRaw.length;
    const contentLastIndex = match.index;

    const forTemplate = content.substring(forRawLastIndex, contentLastIndex);
    const resFirstLineNumber = getLineNumber(content, forRawLastIndex + 1);
    const resLastLineNumber = getLineNumber(content, contentLastIndex + 1);

    let collection = evalExp(forTag.collectionName, vars);
    if (!collection || !Array.isArray(collection)) {
        collection = [];
        log.error(`${bold(forTag.collectionName)} is undefined or not iterable`);
    }

    collection.forEach((item) => {
        const newVars = {...vars, [forTag.variableName]: item};
        res += applyLiquid(forTemplate, newVars, path).trimRight();
    });

    const contentLinesTotal = res.split('\n').length - 1;

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
    if (
        res === '' &&
        preparedLeftContent[preparedLeftContent.length - 1] === '\n' &&
        content[lastIndex] === '\n'
    ) {
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

type Tag = {
    item: string;
    variableName: string;
    collectionName: string;
    startPos: number;
    forRaw: string;
};

export = function cycles(
    originInput: string,
    vars: Record<string, unknown>,
    path?: string,
    settings: {sourceMap?: Record<number, number>} = {},
) {
    const {sourceMap} = settings;

    const R_LIQUID = /({%-?([\s\S]*?)-?%})/g;
    const FOR_SYNTAX = new RegExp(`(\\w+)\\s+in\\s+(${variable.source})`);

    let match;
    const tagStack: Tag[] = [];
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

                const matches = args.match(FOR_SYNTAX);
                if (!matches) {
                    log.error(`Incorrect syntax in if condition${path ? ` in ${bold(path)}` : ''}`);
                    break;
                }

                const [variableName, collectionName] = matches.slice(1);
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

                if (!forTag) {
                    log.error(
                        `For block must be opened before close${path ? ` in ${bold(path)}` : ''}`,
                    );
                    break;
                }

                const {idx, result} = inlineConditions({
                    forTag,
                    vars,
                    content: input,
                    match,
                    path,
                    lastIndex: R_LIQUID.lastIndex,
                    sourceMap: sourceMap || {},
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
};
