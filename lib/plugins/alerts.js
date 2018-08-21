'use strict';

const ALERT_RE = /^\[!(NOTE|TIP|WARNING|IMPORTANT)]/;
// TODO: i18n
const contentByType = {
    note: 'Примечание',
    tip: 'Совет',
    warning: 'Предупреждение',
    important: 'Важная информация'
};

function findBlockquoteCloseToken(tokens, idx) {
    let i = idx;
    while (i < tokens.length) {
        if (tokens[i].type === 'blockquote_close') {
            return tokens[i];
        }

        i++;
    }

    return null;
}

function alerts(md) {
    md.core.ruler.push('notes', (state) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            if (
                tokens[i].type === 'blockquote_open' &&
                tokens[i + 1].type === 'paragraph_open' &&
                tokens[i + 2].type === 'inline' &&
                tokens[i + 2].children[0].type === 'text'
            ) {
                const blockquoteOpenToken = tokens[i];
                const blockquoteCloseToken = findBlockquoteCloseToken(tokens, i + 4);
                const inlineToken = tokens[i + 2];
                const match = inlineToken.children[0].content.match(ALERT_RE);

                if (!match || !blockquoteCloseToken) {
                    i += 3;
                    continue;
                }

                const type = match[1].toLowerCase();

                // Change blockquote appearance
                blockquoteOpenToken.tag = 'div';
                blockquoteCloseToken.tag = 'div';
                blockquoteOpenToken.attrSet('class', `alert ${type}`);

                // Remove label tokens
                const nextTextIndex = tokens[i + 2].children.findIndex((token, i) => i > 0 && token.type === 'text');
                inlineToken.children = nextTextIndex > 0 ? inlineToken.children.slice(nextTextIndex) : [];

                // Remove whole paragraph if there is no content within
                if (inlineToken.children.length === 0) {
                    tokens.splice(i + 1, 3);
                }

                // Add extra paragraph
                const paragraphOpen = new state.Token('paragraph_open', 'p', 1);
                const inline = new state.Token('inline', '', 0);
                const strongOpen = new state.Token('strong_open', 'strong', 1);
                const inlineText = new state.Token('text', '', 0);
                const strongClose = new state.Token('strong_close', 'strong', -1);
                const paragraphClose = new state.Token('paragraph_close', 'p', -1);

                paragraphOpen.block = true;
                paragraphClose.block = true;
                inlineText.content = contentByType[type];
                inline.children = [strongOpen, inlineText, strongClose];
                tokens.splice(i + 1, 0, ...[paragraphOpen, inline, paragraphClose]);
                i += 3;
            }

            i++;
        }
    });
}

module.exports = alerts;
