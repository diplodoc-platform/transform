const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');
const {buildVars} = require('../../vars');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

const getElseProp = ({elses}, propName) => elses.length ? elses[0][propName] : undefined;

function findStartBlock(i, tokens) {
    let idx = i;
    let count = 1;

    while (tokens[idx - 1].type.includes('open')) {
        if (tokens[idx + count].type.includes('close')) {
            idx -= 1;
            count += 2;
        } else {
            break;
        }
    }

    return {idx, count};
}

function removeBlock(i, tokens) {
    const {idx, count} = findStartBlock(i, tokens);

    tokens.splice(idx, count);
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

    if (evalExp(ifTag.condition, vars, skipErrors)) {
        newTokens = tokens.slice(ifTag.startRowIdx + 3, getElseProp(ifTag, 'rowIdx') || (i - 1));
    } else {
        ifTag.elses.some(({conditions, rowIdx}) => {
            const isTruthy = !conditions || evalExp(conditions, vars, skipErrors);

            if (isTruthy) {
                newTokens = tokens.slice(rowIdx + 3, i - 1);
                return true;
            }

            return false;
        });
    }

    tokens.splice(ifTag.startRowIdx, i + 1 - (ifTag.startRowIdx - 1), ...newTokens);

    return ifTag.startRowIdx - 2 + newTokens.length + 1;
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
                        startRowIdx: i - 1,
                        startPos: match.index,
                        ifRaw: match[1],
                        elses: []
                    });
                    break;
                case 'else':
                    tagStack[tagStack.length - 1].elses.push({
                        rowIdx: i - 1,
                        startPos: match.index,
                        raw: match[1]
                    });
                    break;
                case 'elsif':
                    tagStack[tagStack.length - 1].elses.push({
                        conditions: args,
                        rowIdx: i - 1,
                        startPos: match.index,
                        raw: match[1]
                    });
                    break;
                case 'endif': {
                    const ifTag = tagStack.pop();

                    if (i - 1 === ifTag.startRowIdx) {
                        const tagsInCurrentRow = tagStack.filter(({startRowIdx}) => startRowIdx === ifTag.startRowIdx);
                        R_LIQUID.lastIndex = inlineConditions(ifTag, vars, i, openToken, match, skipErrors, tagsInCurrentRow.length === 0);
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
    try {
        md.core.ruler.before('curly_attributes', 'conditions', ({tokens, env}) => {
            const builtVars = buildVars(vars, varsPreset, env.path || path, root);

            conditions(tokens, builtVars, skipErrors);
        });
    } catch (e) {
        md.core.ruler.push('conditions', ({tokens, env}) => {
            const builtVars = buildVars(vars, varsPreset, env.path || path, root);

            conditions(tokens, builtVars, skipErrors);
        });
    }
};
