const {bold} = require('chalk');

const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');
const log = require('../log');
const {removeIndentBlock} = require('./utils');

const getElseProp = ({elses}, propName) => elses.length ? elses[0][propName] : undefined;

function inlineConditions({ifTag, vars, content, match, lastIndex}) {
    let res = '';

    if (evalExp(ifTag.condition, vars)) {
        res = content.substring(
            ifTag.startPos + ifTag.ifRaw.length,
            getElseProp(ifTag, 'startPos') || match.index,
        );
    } else {
        ifTag.elses.some(({conditions, startPos, raw}) => {
            const isTruthy = !conditions || evalExp(conditions, vars);

            if (isTruthy) {
                res = content.substring(startPos + raw.length, match.index);
                return true;
            }

            return false;
        });
    }

    const preparedLeftContent = removeIndentBlock(content.substring(0, ifTag.startPos));

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

function conditions(originInput, vars, path) {
    const R_LIQUID = /({%-?([\s\S]*?)-?%})/g;

    let match;
    const tagStack = [];
    let input = originInput;

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
                    conditions: args,
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
                });
                R_LIQUID.lastIndex = idx;
                input = result;

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
