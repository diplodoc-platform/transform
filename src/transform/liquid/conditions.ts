import {bold} from 'chalk';

import evalExp from './evaluation';
import {tagLine} from './lexical';
import {log} from '../log';
import {getPreparedLeftContent, removeIndentBlock} from './utils';
import {createSourceMapApi, getLineNumber} from './sourceMap';

type Options = {
    firstLineNumber: number;
    lastLineNumber: number;
    resFirstLineNumber: number;
    resLastLineNumber: number;
    linesTotal: number;
    sourceMap: Record<number, number>;
};

function changeSourceMap({
    firstLineNumber,
    lastLineNumber,
    resFirstLineNumber,
    resLastLineNumber,
    linesTotal,
    sourceMap,
}: Options) {
    if (!sourceMap) {
        return;
    }

    const {isInlineTag, getSourceMapValue, moveLines, removeLines} = createSourceMapApi({
        firstLineNumber,
        lastLineNumber,
        sourceMap,
    });

    if (isInlineTag) {
        return;
    }

    let offsetRestLines;
    if (resFirstLineNumber) {
        // Move condition's content to the top
        const offsetContentLines = firstLineNumber - resFirstLineNumber;
        moveLines({
            start: resFirstLineNumber,
            end: resLastLineNumber - 1,
            offset: offsetContentLines,
            withReplace: true,
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
    moveLines({start: lastLineNumber + 1, end: linesTotal, offset: offsetRestLines});
}

function getElseProp<B extends keyof Elses>({elses}: {elses: Elses[]}, propName: B, index = 0) {
    if (!elses.length || index >= elses.length) {
        return undefined;
    }

    return elses[index][propName];
}

type Opts = {
    ifTag: Tag;
    vars: Record<string, unknown>;
    content: string;
    match: RegExpExecArray;
    lastIndex: number;
    sourceMap: Record<number, number>;
    linesTotal: number;
};

function inlineConditions({ifTag, vars, content, match, lastIndex, sourceMap, linesTotal}: Opts) {
    let res = '';
    const firstLineNumber = getLineNumber(content, ifTag.startPos);
    const lastLineNumber = getLineNumber(content, lastIndex);
    let resFirstLineNumber = 0;
    let resLastLineNumber = 0;

    if (evalExp(ifTag.condition, vars)) {
        const ifRawLastIndex = ifTag.startPos + ifTag.ifRaw.length;
        const contentLastIndex = getElseProp(ifTag, 'startPos') || match.index;

        res = content.substring(ifRawLastIndex, contentLastIndex);
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
        firstLineNumber,
        lastLineNumber,
        resFirstLineNumber,
        resLastLineNumber,
        linesTotal,
        sourceMap,
    });

    const preparedLeftContent = getPreparedLeftContent({
        content,
        tagStartPos: ifTag.startPos,
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
        if (res[0] === '\n') {
            res = res.substring(1);
        }

        res = removeIndentBlock(res);

        if (res[res.length - 1] === '\n') {
            res = res.slice(0, -1);
        }
    }

    const leftPart = preparedLeftContent + res;

    return {
        result: leftPart + content.substring(lastIndex + shift),
        idx: leftPart.length,
    };
}

type Elses = {startPos: number; raw: string; condition?: string};

type Tag = {
    isOpen: Boolean;
    condition: string;
    startPos: number;
    ifRaw: string;
    elses: Elses[];
};

export = function conditions(
    originInput: string,
    vars: Record<string, unknown>,
    path?: string,
    settings?: {
        sourceMap: Record<number, number>;
    },
) {
    const sourceMap = settings?.sourceMap || {};

    const R_LIQUID = /({%-?([\s\S]*?)-?%})/g;

    let match;
    const tagStack: Tag[] = [];
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

                if (!ifTag) {
                    log.error(
                        `If block must be opened before close${path ? ` in ${bold(path)}` : ''}`,
                    );
                    break;
                }

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
};
