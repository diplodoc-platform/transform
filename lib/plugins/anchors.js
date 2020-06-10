const slugify = require('slugify');
const {bold} = require('chalk');

const {headingInfo} = require('../utils');

function createLinkTokens(state, id) {
    const open = new state.Token('link_open', 'a', 1);
    const text = new state.Token('text', '', 0);
    const close = new state.Token('link_close', 'a', -1);

    open.attrSet('href', '#' + id);
    open.attrSet('class', 'yfm-anchor');
    open.attrSet('aria-hidden', 'true');
    text.content = '';

    return [open, text, close];
}

function anchors(md, {extractTitleOption, path, log}) {
    const plugin = (state) => {
        const ids = {};
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];
            const isHeading = token.type === 'heading_open';

            if (isHeading) {
                const {title, level} = headingInfo(tokens, i);
                let id = token.attrGet('id');
                if (!title) {
                    log.warn(`Header without title${path ? ` in ${bold(path)}` : ''}`);
                }

                if (level < 2 && extractTitleOption) {
                    i += 3;
                    continue;
                }

                if (!id) {
                    id = slugify(title || '', {lower: true});
                    token.attrSet('id', id);
                }

                if (ids[id]) {
                    id = id + ids[id]++;
                    token.attrSet('id', id);
                } else {
                    ids[id] = 1;
                }

                const inlineToken = tokens[i + 1];
                const linkTokens = createLinkTokens(state, id);

                inlineToken.children.unshift(...linkTokens);
            }

            i++;
        }
    };

    try {
        md.core.ruler.before('links', 'anchors', plugin);
    } catch (e) {
        md.core.ruler.push('anchors', plugin);
    }
}

module.exports = anchors;
