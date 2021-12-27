const {nestedCloseTokenIdxFactory: closeTokenFactory} = require('./utils');

const CUT_REGEXP = /^{%\s*cut\s*["|'](.*)["|']\s*%}/;

function matchCloseToken(tokens, i) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endcut %}'
    );
}

function matchOpenToken(tokens, i) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(CUT_REGEXP)
    );
}

const findCloseTokenIdx = closeTokenFactory('Cut', matchOpenToken, matchCloseToken);

function cut(md, {path, log}) {

    const plugin = (state) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const match = matchOpenToken(tokens, i);

            if (match) {
                const closeTokenIdx = findCloseTokenIdx(tokens, i + 4, path, log);

                if (!closeTokenIdx) {
                    i += 3;
                    continue;
                }

                const newOpenToken = new state.Token('yfm_cut_open', 'div', 1);
                newOpenToken.attrSet('class', 'yfm-cut');

                const titleOpen = new state.Token('yfm_cut_title_open', 'div', 1);
                titleOpen.attrSet('class', 'yfm-cut-title');

                const textTitle = new state.Token('text', '', 0);
                textTitle.content = match[1] === undefined ? 'ad' : match[1];

                const titleClose = new state.Token('yfm_cut_title_close', 'div', -1);

                const contentOpen = new state.Token('yfm_cut_content_open', 'div', 1);
                contentOpen.attrSet('class', 'yfm-cut-content');

                const contentClose = new state.Token('yfm_cut_content_close', 'div', -1);

                const newCloseToken = new state.Token('yfm_cut_close', 'div', -1);

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

                i++;
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
}

module.exports = cut;
