const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

function inlineConditions(ifTag, vars, i, openToken, match) {
    let isTruthy = evalExp(ifTag.condition, vars);

    openToken.children.forEach((childToken) => {
        const content = childToken.content;
        let res = '';

        if (isTruthy) {
            res = content.substring(ifTag.startPos + ifTag.ifRaw.length, ifTag.elseStartPos || match.index).trim();
        } else {
            if (ifTag.elseStartPos) {
                isTruthy = !ifTag.elseConditions || evalExp(ifTag.elseConditions, vars);
                res = isTruthy ? content.substring(ifTag.elseStartPos + ifTag.elseRaw.length, match.index) : '';
            }
        }
        childToken.content = content.substring(0, ifTag.startPos) + res + content.substring(R_LIQUID.lastIndex);
    });

    return i + 1;
}

function blockConditions(ifTag, vars, i, tokens) {
    let newTokens = [];
    let isTruthy = evalExp(ifTag.condition, vars);

    if (isTruthy) {
        newTokens = tokens.slice(ifTag.startRowIdx + 2, (ifTag.elseRowIdx || i) - 2);
    } else {
        if (ifTag.elseRowIdx) {
            isTruthy = !ifTag.elseConditions || evalExp(ifTag.elseConditions, vars);
            newTokens = isTruthy ? tokens.slice(ifTag.elseRowIdx + 2, i - 2) : [];
        }
    }

    tokens.splice(ifTag.startRowIdx, i + 1 - ifTag.startRowIdx, ...newTokens);

    return ifTag.startRowIdx - 2 + newTokens.length + 1;
}

function parseTagToken(value) {
    const match = value.match(tagLine);

    if (!match) {
        return;
    }

    return {
        type: match[1],
        args: match[2]
    };
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

            const {type, args} = parseTagToken(match[2].trim());

            switch (type) {
                case 'if':
                    tagStack.push({
                        isOpen: true,
                        condition: args,
                        startRowIdx: i - 1,
                        startPos: match.index,
                        ifRaw: match[1]
                    });
                    break;
                case 'else':
                    tagStack[tagStack.length - 1] = {
                        ...tagStack[tagStack.length - 1],
                        elseRowIdx: i - 1,
                        elseStartPos: match.index,
                        elseRaw: match[1]
                    };
                    break;
                case 'elsif':
                    tagStack[tagStack.length - 1] = {
                        ...tagStack[tagStack.length - 1],
                        elseConditions: args,
                        elseRowIdx: i - 1,
                        elseStartPos: match.index,
                        elseRaw: match[1]
                    };
                    break;
                case 'endif': {
                    const ifTag = tagStack.pop();

                    if (i - 1 === ifTag.startRowIdx) {
                        i = inlineConditions(ifTag, vars, i, openToken, match);
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
