const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');
const {buildVars} = require('../../vars');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

const getElseProp = ({elses}, propName) => elses.length ? elses[0][propName] : undefined;

function findStartBlock(i, tokens) {
    let idx = i;
    let length = 1;

    while (tokens[idx - 1].type.includes('open')) {
        if (tokens[idx + length].type.includes('close')) {
            idx -= 1;
            length += 2;
        } else {
            break;
        }
    }

    return {idx, length};
}

function removeBlock(i, tokens) {
    const {idx, length} = findStartBlock(i, tokens);

    tokens.splice(idx, length);
}

function clearListItem(itemToken, inlineToken, cb) {
    if (itemToken.type !== 'list_item_open') {
        return;
    }

    inlineToken.content = inlineToken.content.split('\n{%')[0];
    if (!inlineToken.content.startsWith('{%')) {
        const breakIdx = inlineToken.children.findIndex((child) => child.type === 'softbreak');
        inlineToken.children.splice(breakIdx, inlineToken.children.length);

        cb();
    }
}

function inlineConditions(ifTag, vars, i, openToken, match, skipErrors, isFinal) {
    const content = openToken.content;
    let res = '';

    if (evalExp(ifTag.condition, vars, skipErrors)) {
        res = content.substring(
            ifTag.startPos + ifTag.ifRaw.length,
            getElseProp(ifTag, 'startPos') || match.index
        );
    } else {
        ifTag.elses.some(({conditions, startPos, raw}) => {
            const isTruthy = !conditions || evalExp(conditions, vars, skipErrors);

            if (isTruthy) {
                res = content.substring(startPos + raw.length, match.index);
                return true;
            }

            return false;
        });
    }
    const leftPart = content.substring(0, ifTag.startPos) + res.trim();
    openToken.content = leftPart + content.substring(R_LIQUID.lastIndex);

    if (openToken.children && isFinal) {
        if (openToken.children.length === 1) {
            openToken.children[0].content = openToken.content;
        } else {
            const children = [];
            openToken.children.forEach((token) => {
                token.content = token.content.split(/\s{%|%}\s/).reduce((acc, str) => {
                    if (str && openToken.content.includes(str)) {
                        return acc ? `${acc} ${str}` : str;
                    }

                    return acc;
                }, '');

                if (token.content) {
                    children.push(token);
                }
            });
            openToken.children = children;
        }
    }

    return leftPart.length;
}

function blockConditions(ifTag, vars, i, tokens, skipErrors) {
    let newTokens = [];
    let {idx, length} = findStartBlock(ifTag.startRowIdx, tokens);
    const {idx: currentIdx, length: currentLength} = findStartBlock(i, tokens);

    if (evalExp(ifTag.condition, vars, skipErrors)) {
        const elsePos = getElseProp(ifTag, 'rowIdx') || i;
        const {idx: elseIdx, length: elseLength} = findStartBlock(elsePos, tokens);
        newTokens = tokens.slice(idx + length, elseIdx);

        clearListItem(
            tokens[elseIdx],
            tokens[elsePos],
            () => {
                newTokens = [...newTokens, ...tokens.slice(elseIdx, elseIdx + elseLength)];
            }
        );
    } else {
        ifTag.elses.some(({conditions, rowIdx}, j, elses) => {
            const isTruthy = !conditions || evalExp(conditions, vars, skipErrors);

            if (isTruthy) {
                let lastElseIdx = currentIdx;
                let lastElsePos = i;
                let lastElseLength = currentLength;
                const {idx, length} = findStartBlock(rowIdx, tokens);

                if (j !== elses.length - 1) {
                    lastElsePos = elses[j + 1].rowIdx;
                    const res = findStartBlock(lastElsePos, tokens);
                    lastElseIdx = res.idx;
                    lastElseLength = res.length;
                }

                clearListItem(tokens[lastElseIdx], tokens[lastElsePos], () => { lastElseIdx += lastElseLength; });

                newTokens = tokens.slice(idx + length, lastElseIdx);

                return true;
            }

            return false;
        });
    }

    clearListItem(tokens[idx], tokens[ifTag.startRowIdx], () => { idx += 5; });

    tokens.splice(idx, currentIdx + currentLength - idx, ...newTokens);

    return idx + newTokens.length;
}

function conditions(tokens, vars, skipErrors) {
    const tagStack = [];
    let i = 0;

    while (i < tokens.length) {
        const openToken = tokens[i];

        if (openToken.type !== 'inline') {
            i++;
            continue;
        }

        let match;

        while ((match = R_LIQUID.exec(openToken.content)) !== null) {
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
                        startRowIdx: i,
                        startPos: match.index,
                        ifRaw: match[1],
                        elses: []
                    });
                    break;
                case 'else':
                    tagStack[tagStack.length - 1].elses.push({
                        rowIdx: i,
                        startPos: match.index,
                        raw: match[1]
                    });
                    break;
                case 'elsif':
                    tagStack[tagStack.length - 1].elses.push({
                        conditions: args,
                        rowIdx: i,
                        startPos: match.index,
                        raw: match[1]
                    });
                    break;
                case 'endif': {
                    const ifTag = tagStack.pop();

                    if (i === ifTag.startRowIdx) {
                        const tagsInCurrentRow = tagStack.filter(({startRowIdx}) => startRowIdx === ifTag.startRowIdx);

                        R_LIQUID.lastIndex = inlineConditions(
                            ifTag, vars, i, openToken, match, skipErrors, tagsInCurrentRow.length === 0
                        );

                        if (openToken.content === '') {
                            removeBlock(i, tokens);
                        }
                    } else {
                        i = blockConditions(ifTag, vars, i, tokens, skipErrors);
                    }
                    break;
                }
            }
        }

        i++;
    }
}

module.exports = (md, {vars, varsPreset, path, root, skipErrors}) => {
    const plugin = ({tokens, env}) => {
        const builtVars = buildVars(vars, varsPreset, env.path || path, root);

        conditions(tokens, builtVars, skipErrors);
    };

    try {
        md.core.ruler.before('curly_attributes', 'conditions', plugin);
    } catch (e) {
        md.core.ruler.push('conditions', plugin);
    }
};
