const slugify = require('slugify');
const {bold} = require('chalk');
const GithubSlugger = require('github-slugger');

const {headingInfo} = require('../../utils');
const {saveAnchor, setFileAsProcessedWithAnchors} = require('../../utilsFS');
const {
    CUSTOM_ID_REGEXP,
    CUSTOM_ID_EXCEPTION,
} = require('./constants');

function createLinkTokens(state, id, setId = false) {
    const open = new state.Token('link_open', 'a', 1);
    const text = new state.Token('text', '', 0);
    const close = new state.Token('link_close', 'a', -1);

    if (setId) {
        open.attrSet('id', id);
    }
    open.attrSet('href', '#' + id);
    open.attrSet('class', 'yfm-anchor');
    open.attrSet('aria-hidden', 'true');
    text.content = '';

    return [open, text, close];
}

const getCustomIds = (content) => {
    const ids = [];

    content.replace(CUSTOM_ID_REGEXP, (match, customId) => {
        if (match === CUSTOM_ID_EXCEPTION) {
            return;
        }

        ids.push(customId);
    });

    return ids.length ? ids : null;
};
const removeCustomId = (content) => {
    if (CUSTOM_ID_REGEXP.test(content)) {
        return content.replace(CUSTOM_ID_REGEXP, (match) => {
            if (match === CUSTOM_ID_EXCEPTION) {
                return match;
            }

            return '';
        }).trim();
    }

    return content;
};
const removeCustomIds = (token) => {
    token.content = removeCustomId(token.content);
    token.children.forEach((child) => {
        child.content = removeCustomId(child.content);
    });
};

function index(md, {extractTitle, path, log, supportGithubAnchors}) {
    const plugin = (state) => {
        /* Do not use the plugin if it is included in the file */
        if (state.env.includes && state.env.includes.length) {
            return;
        }

        const ids = {};
        const tokens = state.tokens;
        let i = 0;
        const slugger = new GithubSlugger();

        while (i < tokens.length) {
            const token = tokens[i];
            const isHeading = token.type === 'heading_open';

            if (isHeading) {
                const {title, level} = headingInfo(tokens, i);
                const inlineToken = tokens[i + 1];
                let id = token.attrGet('id');
                let customIds, ghId;

                if (!title) {
                    log.warn(`Header without title${path ? ` in ${bold(path)}` : ''}`);
                }

                if (level < 2 && extractTitle) {
                    i += 3;
                    continue;
                }

                if (!id) {
                    customIds = getCustomIds(inlineToken.content);
                    if (customIds) {
                        id = customIds[0];
                        removeCustomIds(tokens[i + 1]);
                    } else {
                        id = slugify(title, {
                            lower: true,
                            remove: /[*+~.()'"!:@]/g,
                        });
                        ghId = slugger.slug(title);
                    }

                    token.attrSet('id', id);
                }

                if (customIds) {
                    customIds = customIds.map((customId) => {
                        if (ids[customId]) {
                            return customId + ids[customId]++;
                        }

                        ids[customId] = 1;

                        return customId;
                    });

                    id = customIds[0];
                    token.attrSet('id', id);
                } else if (ids[id]) {
                    id = id + ids[id]++;
                    token.attrSet('id', id);
                } else {
                    ids[id] = 1;
                }

                const allAnchorIds = customIds ? customIds : [id];

                allAnchorIds.forEach((customId) => {
                    saveAnchor(path, customId);

                    const setId = id !== customId;
                    const linkTokens = createLinkTokens(state, customId, setId);

                    inlineToken.children.unshift(...linkTokens);

                    if (supportGithubAnchors) {
                        const ghLinkTokens = createLinkTokens(state, ghId, true);
                        inlineToken.children.unshift(...ghLinkTokens);
                    }
                });

                i += 3;
                continue;
            }

            /* Save identifiers not only in headers */
            if (CUSTOM_ID_REGEXP.test(token.content)) {
                const customIds = getCustomIds(token.content);
                if (customIds) {
                    customIds.forEach((customId) => {
                        saveAnchor(path, customId);
                    });
                }
            }

            i++;
        }

        setFileAsProcessedWithAnchors(path);
    };

    try {
        md.core.ruler.after('includes', 'anchors', plugin);
    } catch {
        try {
            md.core.ruler.after('curly_attributes', 'anchors', plugin);
        } catch {
            md.core.ruler.push('anchors', plugin);
        }
    }
}

module.exports = index;
