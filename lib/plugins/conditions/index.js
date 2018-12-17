const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

function inlineConditions(ifTag, flg, vars, i, openToken, match) {
    openToken.children.forEach(childToken => {
        const content = childToken.content;
        let res = '';

        if (flg) {
            res = content.substring(ifTag.startPos + ifTag.ifRaw.length, ifTag.elseStartPos || match.index).trim();
        } else {
            if (ifTag.elseStartPos) {
                flg = !ifTag.elseConditions || evalExp(ifTag.elseConditions, vars);
                res = flg ? content.substring(ifTag.elseStartPos + ifTag.elseRaw.length, match.index) : '';
            }
        }
        childToken.content = content.substring(0, ifTag.startPos) + res + content.substring(R_LIQUID.lastIndex);
    });

    return i + 1;
}

function blockConditions(ifTag, flg, vars, i, tokens) {
    let newTokens = [];

    if (flg) {
        newTokens = tokens.slice(ifTag.startRowIdx + 2, (ifTag.elseIdx || i) - 2);
    } else {
        if (ifTag.elseIdx) {
            flg = !ifTag.elseConditions || evalExp(ifTag.elseConditions, vars);
            newTokens = flg ? tokens.slice(ifTag.elseIdx + 2, i - 2) : [];
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

function conditions(md, {vars}) {
    md.core.ruler.push('ifs', (state) => {
        const {tokens} = state;
        let i = 0;
        // вложенные if-ы должны класться в стек
        let ifTag = {
            isOpen: false
        };

        while (i < tokens.length) {
            const openToken = tokens[i];

            if (openToken.type !== 'inline') {
                i++;
                continue;
            }

            for (let match; (match = R_LIQUID.exec(openToken.content));) {
                if (!match[1]) {
                    continue;
                }

                const {type, args} = parseTagToken(match[2].trim());

                switch (type) {
                    case 'if':
                        ifTag = {
                            isOpen: true,
                            condition: args,
                            startRowIdx: i - 1,
                            startPos: match.index,
                            ifRaw: match[1]
                        };
                        break;
                    case 'else':
                        ifTag.elseIdx = i - 1;
                        ifTag.elseStartPos = match.index;
                        ifTag.elseRaw = match[1];
                        break;
                    case 'elsif':
                        ifTag.elseConditions = args;
                        ifTag.elseIdx = i - 1;
                        ifTag.elseStartPos = match.index;
                        ifTag.elseRaw = match[1];
                        break;
                    case 'endif': {
                        const flg = evalExp(ifTag.condition, vars);

                        if (i - 1 === ifTag.startRowIdx) {
                            i = inlineConditions(ifTag, flg, vars, i, openToken, match);
                        } else {
                            i = blockConditions(ifTag, flg, vars, i, tokens);
                        }

                        ifTag = {
                            isOpen: false,
                            condition: undefined,
                            startRowIdx: undefined
                        };
                        break;
                    }
                }
            }

            i++;
        }
    });
}

module.exports = conditions;
