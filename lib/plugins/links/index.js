const path = require('path');
const url = require('url');
const {bold} = require('chalk');
const {
    isLocalUrl,
    findBlockTokens,
    headingInfo,
} = require('../../utils');
const {
    isFileExists,
    getFileTokens,
} = require('../../utilsFS');
const {PAGE_LINK_REGEXP} = require('./constants');

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

const addTitle = ({hash, file, state, opts, isEmptyLink, tokens, idx, nextToken, href, currentPath, log}) => {
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
        log.warn(`Title not found: ${bold(href)} in ${bold(currentPath)}`);
    }
};

// eslint-disable-next-line complexity
function processLink(state, tokens, idx, opts) {
    const {path: startPath, root, transformLink, notFoundCb, needSkipLinkFn, log} = opts;
    const currentPath = state.env.path || startPath;
    const linkToken = tokens[idx];
    const nextToken = tokens[idx + 1];
    let href = linkToken.attrGet('href');

    if (!href) {
        log.error(`Empty link in ${bold(startPath)}`);
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
                log.error(`Link is unreachable: ${bold(href)} in ${bold(currentPath)}`);
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
        addTitle({hash, file, state, opts, isEmptyLink, tokens, idx, nextToken, href, currentPath, log});
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

function index(md, opts) {
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

module.exports = index;
