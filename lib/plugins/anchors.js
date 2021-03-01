const slugify = require('slugify');
const {bold} = require('chalk');
const _ = require('lodash');

const {
    headingInfo, getSinglePageAnchorId, resolveRelativePath, transformLinkToOriginalArticle,
} = require('../utils');

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

const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/g;
const CUSTOM_ID_EXCEPTION = '[{#T}]';
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

function anchors(md, {extractTitleOption, path, log}) {
    const plugin = (state) => {
        /* Do not use the plugin if it is included in the file */
        if (state.env.includes && state.env.includes.length) {
            return;
        }

        const ids = {};
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];
            const isHeading = token.type === 'heading_open';

            if (isHeading) {
                const {title, level} = headingInfo(tokens, i);
                const inlineToken = tokens[i + 1];
                let id = token.attrGet('id');
                let customIds;

                if (!title) {
                    log.warn(`Header without title${path ? ` in ${bold(path)}` : ''}`);
                }

                if (level < 2 && extractTitleOption) {
                    i += 3;
                    continue;
                }

                if (!id) {
                    customIds = getCustomIds(inlineToken.content);
                    if (customIds) {
                        id = customIds[0];
                        removeCustomIds(tokens[i + 1]);
                    } else {
                        id = slugify(title || '', {
                            lower: true,
                            remove: /[*+~.()'"!:@]/g,
                        });
                    }

                    token.attrSet('id', id);
                }

                if (ids[id]) {
                    id = id + ids[id]++;
                    token.attrSet('id', id);
                } else {
                    ids[id] = 1;
                }

                const allAnchorIds = customIds ? customIds : [id];

                allAnchorIds.forEach((customId) => {
                    const setId = id !== customId;
                    const linkTokens = createLinkTokens(state, customId, setId);

                    inlineToken.children.unshift(...linkTokens);
                });

                i += 3;
                continue;
            }

            i++;
        }
    };

    try {
        md.core.ruler.after('includes', 'anchors', plugin);
    } catch (e) {
        md.core.ruler.push('anchors', plugin);
    }
}

/* eslint-disable max-len */
/* If the singlePage option is passed in the options:
*  - replace the default anchor and custom anchors with anchors with file at the beginning
*  - increase the level of headers,
*  - add page anchor to the first matched header
*  Example for file index.md:
*    Before: # Title {#CustomAnchor} {#custom-anchor}
*            ## Subtitle
*    After: ## Title {data-original-article=/index} {#_index} {#_index_title} {#_index_CustomAnchor} {#_index_custom-anchor}
*           ## Subtitle {#_index_subtitle}
* */
/* eslint-enable max-len */
anchors.collect = (input, options) => {
    const {root, path, singlePage} = options;

    if (!singlePage || path.includes('_includes/')) {
        return;
    }

    const currentPath = resolveRelativePath(root, path);
    const pageId = getSinglePageAnchorId({root, currentPath});
    let needToSetPageId = true;
    let needToSetOriginalPathAttr = true;
    const lines = input.split('\n');
    let i = 0;
    const HEADER_LINK_REGEXP = /^(?<headerLevel>#+)\s(?<headerContent>.+)$/i;

    while (i < lines.length) {
        const line = lines[i];
        const headerMatch = line.match(HEADER_LINK_REGEXP);

        if (!headerMatch) {
            i++;
            continue;
        }

        const {headerLevel, headerContent} = headerMatch.groups;
        let newHeaderContent = headerContent;
        const newCustomHeaders = [];

        while (CUSTOM_ID_REGEXP.test(newHeaderContent)) {
            newHeaderContent = newHeaderContent.replace(CUSTOM_ID_REGEXP, (match, customId) => {
                if (match === CUSTOM_ID_EXCEPTION) {
                    return match;
                }

                newCustomHeaders.push(`${pageId}_${customId}`);
                return '';
            });
        }
        newHeaderContent = newHeaderContent.trim();

        const slugifiedTitle = slugify(newHeaderContent, {lower: true});
        newCustomHeaders.push(`${pageId}_${slugifiedTitle}`);
        if (needToSetPageId) {
            newCustomHeaders.push(pageId);
            needToSetPageId = false;
        }

        const newCustomHeadersStr = _.chain(newCustomHeaders)
            .uniq()
            .map((id) => {
                return `{${id}}`;
            })
            .value()
            .join(' ');

        const baseHeaderSyntax = `${headerLevel}# ${newHeaderContent}`;
        lines[i] = `${baseHeaderSyntax} ${newCustomHeadersStr}`;

        if (needToSetOriginalPathAttr) {
            const originalArticleHref = transformLinkToOriginalArticle({root, currentPath});
            lines[i] = `${baseHeaderSyntax} {data-original-article=${originalArticleHref}} ${newCustomHeadersStr}`;

            needToSetOriginalPathAttr = false;
        }

        i++;
    }

    // eslint-disable-next-line consistent-return
    return lines.join('\n');
};

module.exports = anchors;
