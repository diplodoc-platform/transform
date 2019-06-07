'use strict';
const slugify = require('slugify');
const {headingInfo} = require('../utils');

function createLinkTokens(state, id) {
    const open = new state.Token('link_open', 'a', 1);
    const text = new state.Token('text', '', 0);
    const close = new state.Token('link_close', 'a', -1);

    open.attrSet('href', '#' + id);
    open.attrSet('class', 'anchor');
    open.attrSet('aria-hidden', 'true');
    text.content = '';

    return [open, text, close];
}

function anchors(md) {
    md.core.ruler.push('anchors', (state) => {
        const ids = {};
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];
            const isHeading = token.type === 'heading_open';

            if (isHeading) {
                const {title, level} = headingInfo(tokens, i);
                let id = token.attrGet('id');

                if (level < 2) {
                    i += 3;
                    continue;
                }

                if (!id) {
                    id = slugify(title, {lower: true});
                    token.attrSet('id', id);
                }

                if (!ids[id]) {
                    ids[id] = 1;
                } else {
                    id = id + ids[id]++;
                    token.attrSet('id', id);
                }

                const inlineToken = tokens[i + 1];
                const linkTokens = createLinkTokens(state, id);

                inlineToken.children.unshift(...linkTokens);
            }

            i++;
        }
    });
}

module.exports = anchors;
