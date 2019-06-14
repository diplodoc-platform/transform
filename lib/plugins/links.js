'use strict';
const path = require('path');
const url = require('url');
const {bold} = require('chalk');
const {isLocalUrl, isFileExists, getFileTokens, findBlockTokens, headingInfo} = require('../utils');
const log = require('../log');

const PAGE_LINK_REGEXP = /\.(md|ya?ml)$/i;

function defaultTransformLink(href) {
    const parsed = url.parse(href);

    return url.format({
        ...parsed,
        pathname: parsed.pathname.replace(PAGE_LINK_REGEXP, '.html')
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

function processLink(state, tokens, idx, opts) {
    const {path: startPath, oneFile, root, transformLink, notFoundCb} = opts;
    const currentPath = state.env.path || startPath;
    const linkToken = tokens[idx];
    const nextToken = tokens[idx + 1];
    let href = linkToken.attrGet('href');

    if (!href) {
        log.warn(`Empty link in ${bold(startPath)}`);
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
            if (notFoundCb) {
                notFoundCb(file.replace(root, ''));
            }
            log.warn(`Link is unreachable: ${bold(href)} in ${bold(currentPath)}`);
        }
    } else if (hash) {
        file = currentPath;
        fileExists = true;
        isPageFile = true;
    } else {
        return;
    }

    const isEmptyLink = nextToken.type === 'link_close';
    const isTitleRefLink = nextToken.type === 'text' && nextToken.content === '#T';
    if ((isEmptyLink || isTitleRefLink) && fileExists && isPageFile) {
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
    }

    if (oneFile) {
        href = href.includes('#')
            ? href.split('#').pop()
            : file
                .replace(root + path.sep, '')
                .replace(new RegExp(path.sep, 'gi'), '_');

        linkToken.attrSet('href', `#${href}`);

        return;
    }

    if (currentPath !== startPath) {
        const newPathname = path.relative(path.parse(startPath).dir, file);

        href = url.format({
            ...url.parse(href),
            pathname: newPathname
        });

        linkToken.attrSet('href', href);
    }

    if (pathname) {
        const transformer = transformLink || defaultTransformLink;
        linkToken.attrSet('href', transformer(href));
    }
}

module.exports = function links(md, opts) {
    md.core.ruler.before('includes', 'links', (state) => {
        const tokens = state.tokens;
        let i = 0;

        state.md.disable(['includes', 'links']);

        while (i < tokens.length) {
            if (tokens[i].type === 'inline') {
                const childrenTokens = tokens[i].children;
                let j = 0;

                while (j < childrenTokens.length) {
                    if (childrenTokens[j].type === 'link_open') {
                        processLink(state, childrenTokens, j, opts);
                    }

                    j++;
                }
            }

            i++;
        }

        state.md.enable(['includes', 'links']);

    });
};
