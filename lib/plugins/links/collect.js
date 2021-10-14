const MarkdownIt = require('markdown-it');
const url = require('url');
const {relative, dirname} = require('path');
const {
    isLocalUrl,
} = require('../../utils');
const {
    getSinglePageAnchorId,
    resolveRelativePath,
} = require('../../utilsFS');
const links = require('./index');
const deflist = require('../deflist');
const meta = require('../meta');
const {INCLUDE_REGEXP} = require('../includes/constants');
const {PAGE_LINK_REGEXP} = require('./constants');

const replaceLinkHref = (input, href, newHref, title = '') => {
    /* Try not replace include syntax */
    return input.replace(`${title ? '{#T}' : ''}](${href})`, `${title}](${newHref})`);
};

/* Replace the links to the markdown and yaml files if the singlePage option is passed in the options
*  Example: replace [Text](../../path/to/file.md#anchor) with [Text](#_path_to_file_anchor)
* */
const collect = (input, options) => {
    const {root, path: startPath, destPath, singlePage, singlePageRoot = ''} = options;

    if (!singlePage) {
        return;
    }

    let result = input;

    const needSkipLinkFn = () => true; /* Ignore all link errors there */
    const transformLink = (href) => href;
    const md = new MarkdownIt();
    [
        meta,
        deflist,
        links,
    ].forEach((plugin) => {
        md.use(plugin, {...options, transformLink, needSkipLinkFn});
    });

    const tokens = md.parse(result, {});

    let i = 0;
    while (i < tokens.length) {
        if (tokens[i].type === 'inline' && !INCLUDE_REGEXP.test(tokens[i].content)) {
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

                if (!href || !isLocalUrl(href)) {
                    j++;
                    continue;
                }

                /* If the links refer to files that are not included in the single-page file,
                *  replace the links in the single-page file with relative links from the single-page file
                * */
                const linkFullPath = resolveRelativePath(destPath, href);
                const tocDir = dirname(singlePageRoot);
                const isLinkOutOfToc = !linkFullPath.startsWith(tocDir);

                if (isLinkOutOfToc) {
                    const newHref = relative(singlePageRoot, linkFullPath);

                    result = replaceLinkHref(result, href, newHref);
                    j++;
                    continue;
                }

                /* If the links refer to files included in a single-page file,
                *  replace the links in the single-page file with the hash of the page in the single-page file
                * */
                const {pathname, hash} = url.parse(href);
                if (pathname) {
                    const isPageFile = PAGE_LINK_REGEXP.test(pathname);
                    if (isPageFile) {
                        const nextToken = childrenTokens[j + 1];
                        const isTitleRefLink = nextToken.type === 'text' && nextToken.prevContent === '{#T}';
                        const titleRefContent = isTitleRefLink ? nextToken.content : '';

                        const newHref = getSinglePageAnchorId({root, currentPath: startPath, pathname, hash});

                        result = replaceLinkHref(result, href, newHref, titleRefContent);
                    }
                } else if (hash) {
                    const newHref = getSinglePageAnchorId({root, currentPath: startPath, hash});
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
