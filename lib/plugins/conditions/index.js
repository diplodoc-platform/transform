const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

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
            isOpen: false,
            condition: undefined,
            start: undefined,
            elseIdx: undefined
        };

        while (i < tokens.length) {
            const openToken = tokens[i];

            if (openToken.type !== 'inline') {
                i++;
                continue;
            }

            let lastMatchEnd = 0;
            const content = openToken.content;

            for (let match; (match = R_LIQUID.exec(content)); lastMatchEnd = R_LIQUID.lastIndex) {
                if (ifTag.isOpen && match.index > lastMatchEnd) {
                    continue;
                }

                if (!match[1]) {
                    continue;
                }

                const {type, args} = parseTagToken(match[2].trim());

                switch (type) {
                    case 'if':
                        ifTag = {
                            isOpen: true,
                            condition: args,
                            start: i - 1
                        };
                        break;
                    case 'else':
                        ifTag.elseIdx = i - 1;
                        break;
                    case 'elsif':
                        ifTag.elseConditions = args;
                        ifTag.elseIdx = i - 1;
                        break;
                    case 'endif': {
                        let newTokens = [];
                        let flg = evalExp(ifTag.condition, vars);

                        if (evalExp(ifTag.condition, vars)) {
                            newTokens = tokens.slice(ifTag.start + 2, (ifTag.elseIdx ||  i) - 2);
                        } else {
                            if (ifTag.elseIdx) {
                                flg = !ifTag.elseConditions || evalExp(ifTag.elseConditions, vars);
                                newTokens = flg ? tokens.slice(ifTag.elseIdx + 2, i - 2) : [];
                            }
                        }

                        tokens.splice(ifTag.start, i + 1, ...newTokens);
                        i = ifTag.start - 2 + newTokens.length + 1;

                        ifTag = {
                            isOpen: false,
                            condition: undefined,
                            start: undefined
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
