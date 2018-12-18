const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

const getElseProp = ({elseStack}, propName) => elseStack.length ? elseStack[0][propName] : undefined;

function inlineConditions(ifTag, vars, i, openToken, match) {
    let leftPart = '';

    openToken.children.forEach((childToken) => {
        const content = childToken.content;
        let res = '';

        if (evalExp(ifTag.condition, vars)) {
            res = content.substring(
                ifTag.startPos + ifTag.ifRaw.length,
                getElseProp(ifTag, 'startPos') || match.index
            );
        } else {
            ifTag.elseStack.some(({conditions, startPos, raw}) => {
                const isTruthy = !conditions || evalExp(conditions, vars);

                if (isTruthy) {
                    res = content.substring(startPos + raw.length, match.index);
                    return true;
                }

                return false;
            });
        }
        leftPart = content.substring(0, ifTag.startPos) + res.trim();
        openToken.content = childToken.content = leftPart + content.substring(R_LIQUID.lastIndex);
    });

    return leftPart.length;
}

function blockConditions(ifTag, vars, i, tokens) {
    let newTokens = [];

    if (evalExp(ifTag.condition, vars)) {
        newTokens = tokens.slice(ifTag.startRowIdx + 3, getElseProp(ifTag, 'rowIdx') || (i - 1));
    } else {
        ifTag.elseStack.some(({conditions, rowIdx}) => {
            const isTruthy = !conditions || evalExp(conditions, vars);

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

function conditions(tokens, vars) {
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

            const [type, args] = match[2].trim().match(tagLine).slice(1);

            switch (type) {
                case 'if':
                    tagStack.push({
                        isOpen: true,
                        condition: args,
                        startRowIdx: i - 1,
                        startPos: match.index,
                        ifRaw: match[1],
                        elseStack: []
                    });
                    break;
                case 'else':
                    tagStack[tagStack.length - 1].elseStack.push({
                        rowIdx: i - 1,
                        startPos: match.index,
                        raw: match[1]
                    });
                    break;
                case 'elsif':
                    tagStack[tagStack.length - 1].elseStack.push({
                        conditions: args,
                        rowIdx: i - 1,
                        startPos: match.index,
                        raw: match[1]
                    });
                    break;
                case 'endif': {
                    const ifTag = tagStack.pop();

                    if (i - 1 === ifTag.startRowIdx) {
                        R_LIQUID.lastIndex = inlineConditions(ifTag, vars, i, openToken, match);
                    } else {
                        i = blockConditions(ifTag, vars, i, tokens);
                    }
                    break;
                }
            }
        }

        i++;
    }
}

module.exports = (md, {vars}) => (
    md.core.ruler.push('conditions', ({tokens}) => conditions(tokens, vars))
);
