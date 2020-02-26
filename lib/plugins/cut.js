const {bold} = require('chalk');
const log = require('../log');

const CUT_REGEXP = /^{%\s*cut\s*["|'](.*)["|']\s*%}/;

function findCloseTokenIdx(tokens, idx, path) {
    let i = idx;
    while (i < tokens.length) {
        if (
            tokens[i].type === 'paragraph_open' &&
            tokens[i + 1].type === 'inline' &&
            tokens[i + 1].content.trim() === '{% endcut %}'
        ) {
            return i;
        }

        i++;
    }

    log.error(`Cut must be closed in ${bold(path)}`);

    return null;
}

module.exports = function cut(md, {path}) {

    const plugin = (state) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            if (
                tokens[i].type === 'paragraph_open' &&
                tokens[i + 1].type === 'inline'
            ) {
                const match = tokens[i + 1].content.match(CUT_REGEXP);

                if (!match) {
                    i++;
                    continue;
                }

                const closeTokenIdx = findCloseTokenIdx(tokens, i + 4, path);

                if (!closeTokenIdx) {
                    i += 3;
                    continue;
                }

                const newOpenToken = new state.Token('paragraph_open', 'div', 1);
                newOpenToken.attrSet('class', 'yfm-cut');

                const titleOpen = new state.Token('paragraph_open', 'div', 1);
                titleOpen.attrSet('class', 'yfm-cut-title');

                const textTitle = new state.Token('text', '', 0);
                textTitle.content = match[1] === undefined ? 'ad' : match[1];

                const titleClose = new state.Token('paragraph_close', 'div', -1);

                const contentOpen = new state.Token('paragraph_open', 'div', 1);
                contentOpen.attrSet('class', 'yfm-cut-content');

                const contentClose = new state.Token('paragraph_close', 'div', -1);

                const newCloseToken = new state.Token('paragraph_close', 'div', -1);

                const insideTokens = [
                    newOpenToken,
                    titleOpen,
                    textTitle,
                    titleClose,
                    contentOpen,
                    ...tokens.slice(i + 3, closeTokenIdx),
                    contentClose,
                    newCloseToken,
                ];

                tokens.splice(i, closeTokenIdx - i + 3, ...insideTokens);

                i += insideTokens.length;
            } else {
                i++;
            }
        }
    };

    try {
        md.core.ruler.before('curly_attributes', 'cut', plugin);
    } catch (e) {
        md.core.ruler.push('cut', plugin);
    }
};
