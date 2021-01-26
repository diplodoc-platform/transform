const MarkdownIt = require('markdown-it');
const url = require('url');
const {
    isLocalUrl,
} = require('../../utils');
const {getSinglePageAnchorId} = require('../../utilsFS');
const index = require('./index');
const {PAGE_LINK_REGEXP} = require('./constants');

const replaceLinkHref = (input, href, newHref) => {
    /* Try not replace include syntax */
    return input.replace(`](${href})`, `](${newHref})`);
};

/* Replace the links to the markdown and yaml files if the singlePage option is passed in the options
*  Example: replace [Text](../../path/to/file.md#anchor) with [Text](#_path_to_file_anchor)
* */
const collect = (input, options) => {
    const {root, path: startPath, singlePage} = options;

    if (!singlePage) {
        return;
    }

    let result = input;

    /* Syntax "{% include [Text](_includes/file.md) %}" is parsed as link. Need to ignore errors */
    const needSkipLinkFn = (href) => href.includes('_includes/');
    const transformLink = (href) => href;
    const md = new MarkdownIt()
        .use(index, {...options, transformLink, needSkipLinkFn});
    const tokens = md.parse(result, {});

    let i = 0;
    while (i < tokens.length) {
        if (tokens[i].type === 'inline') {
            const childrenTokens = tokens[i].children;
            let j = 0;

            while (j < childrenTokens.length) {
                const isLinkOpenToken = childrenTokens[j].type === 'link_open';

                if (!isLinkOpenToken) {
                    j++;
                    continue;
                }

                const linkToken = childrenTokens[j];
                const href = linkToken.attrGet('href');

                if (!href || !isLocalUrl(href) || href.includes('_includes/')) {
                    j++;
                    continue;
                }

                const {pathname, hash} = url.parse(href);
                const isPageFile = PAGE_LINK_REGEXP.test(pathname);
                if (isPageFile) {
                    const newHref = getSinglePageAnchorId({root, currentPath: startPath, pathname, hash});
                    result = replaceLinkHref(result, href, newHref);
                }

                j++;
            }
        }

        i++;
    }

    // eslint-disable-next-line consistent-return
    return result;
};


module.exports = collect;
