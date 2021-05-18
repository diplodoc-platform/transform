const path = require('path');
const url = require('url');
const MarkdownIt = require('markdown-it');
const {
    isLocalUrl,
    isFileExists,
    getFileTokens,
    findBlockTokens,
    headingInfo,
    getSinglePageAnchorId,
} = require('../utils');
const {
    logEmptyLinkHref,
    logTitleRefLinkNotFound,
    logUnreachableLink,
} = require('../lintRules/pluginsRules');

const PAGE_LINK_REGEXP = /\.(md|ya?ml)$/i;

function defaultTransformLink(href) {
    const parsed = url.parse(href);

    return url.format({
        ...parsed,
        pathname: parsed.pathname.replace(PAGE_LINK_REGEXP, '.html'),
    });
}

function getTitleFromTokens(tokens) {
    let title = '';

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        if (token.type === 'heading_open') {
            ({title = ''} = headingInfo(tokens, i));

            break;
        }

        i += 2;
    }

    return title;
}

const addTitle = ({hash, file, state, opts, isEmptyLink, tokens, idx, nextToken, href, currentPath}) => {
    const {log, lintOptions, disableLint} = opts;

    const id = hash && hash.slice(1);
    const fileTokens = getFileTokens(file, state, opts);
    const sourceTokens = id ? findBlockTokens(fileTokens, id) : fileTokens;
    const title = getTitleFromTokens(sourceTokens);

    if (title) {
        let textToken;

        if (isEmptyLink) {
            textToken = new state.Token('text', '', 0);
            tokens.splice(idx + 1, 0, textToken);
        } else {
            textToken = nextToken;
        }

        textToken.content = title;
    } else {
        logTitleRefLinkNotFound({
            lintOptions,
            commonOptions: {log, path: currentPath, href, disableLint},
        });
    }
};

// eslint-disable-next-line complexity
function processLink(state, tokens, idx, opts) {
    const {path: startPath, root, transformLink, notFoundCb, needSkipLinkFn, log, lintOptions, disableLint} = opts;
    const currentPath = state.env.path || startPath;
    const linkToken = tokens[idx];
    const nextToken = tokens[idx + 1];
    let href = linkToken.attrGet('href');

    if (!href) {
        logEmptyLinkHref({
            lintOptions,
            commonOptions: {log, path: startPath, disableLint},
        });
        return;
    }

    const {pathname, hash} = url.parse(href);
    let file;
    let fileExists;
    let isPageFile;

    if (!isLocalUrl(href)) {
        linkToken.attrSet('target', '_blank');
        linkToken.attrSet('rel', 'noreferrer noopener');
        return;
    }

    if (pathname) {
        file = path.resolve(path.parse(currentPath).dir, pathname);
        fileExists = isFileExists(file);
        isPageFile = PAGE_LINK_REGEXP.test(pathname);

        if (isPageFile && !fileExists) {
            let needShowError = true;
            if (needSkipLinkFn) {
                needShowError = !needSkipLinkFn(href);
            }

            if (notFoundCb && needShowError) {
                notFoundCb(file.replace(root, ''));
            }

            if (needShowError) {
                logUnreachableLink({
                    lintOptions,
                    commonOptions: {log, path: currentPath, href, disableLint},
                });
            }
        }
    } else if (hash) {
        file = startPath;
        fileExists = true;
        isPageFile = true;
    } else {
        return;
    }

    const isEmptyLink = nextToken.type === 'link_close';
    const isTitleRefLink = nextToken.type === 'text' && nextToken.content === '{#T}';
    if ((isEmptyLink || isTitleRefLink) && fileExists && isPageFile) {
        addTitle({hash, file, state, opts, isEmptyLink, tokens, idx, nextToken, href, currentPath});
    }

    let newPathname;
    if (currentPath !== startPath) {
        newPathname = path.relative(path.parse(startPath).dir, file);

        href = url.format({
            ...url.parse(href),
            pathname: newPathname,
        });
    }

    if (pathname || newPathname) {
        const transformer = transformLink || defaultTransformLink;
        linkToken.attrSet('href', transformer(href));
    }
}

function links(md, opts) {
    const plugin = (state) => {
        const tokens = state.tokens;
        let i = 0;

        state.md.disable(['includes', 'links'], true);

        while (i < tokens.length) {
            if (tokens[i].type === 'inline') {
                const childrenTokens = tokens[i].children;
                let j = 0;

                while (j < childrenTokens.length) {
                    const isLinkOpenToken = childrenTokens[j].type === 'link_open';
                    const tokenClass = childrenTokens[j].attrGet('class');

                    /*  Don't process anchor links */
                    const isYfmAnchor = tokenClass
                        ? tokenClass.includes('yfm-anchor')
                        : false;

                    if (isLinkOpenToken && !isYfmAnchor) {
                        processLink(state, childrenTokens, j, opts);
                    }

                    j++;
                }
            }

            i++;
        }

        state.md.enable(['includes', 'links'], true);
    };

    try {
        md.core.ruler.before('includes', 'links', plugin);
    } catch (e) {
        md.core.ruler.push('links', plugin);
    }
}

const replaceLinkHref = (input, href, newHref) => {
    /* Try not replace include syntax */
    return input.replace(`](${href})`, `](${newHref})`);
};

/* Replace the links to the markdown and yaml files if the singlePage option is passed in the options
*  Example: replace [Text](../../path/to/file.md#anchor) with [Text](#_path_to_file_anchor)
* */
links.collect = (input, options) => {
    const {root, path: startPath, singlePage} = options;

    if (!singlePage) {
        return;
    }

    let result = input;

    /* Syntax "{% include [Text](_includes/file.md) %}" is parsed as link. Need to ignore errors */
    const needSkipLinkFn = (href) => href.includes('_includes/');
    const transformLink = (href) => href;
    const md = new MarkdownIt()
        .use(links, {...options, transformLink, needSkipLinkFn});
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
                if (pathname) {
                    const isPageFile = PAGE_LINK_REGEXP.test(pathname);
                    if (isPageFile) {
                        const newHref = getSinglePageAnchorId({root, currentPath: startPath, pathname, hash});
                        result = replaceLinkHref(result, href, newHref);
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


module.exports = links;
