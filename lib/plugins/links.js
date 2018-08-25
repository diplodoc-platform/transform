'use strict';
const path = require('path');
const url = require('url');
const {bold} = require('chalk');
const {isLocalUrl, isFileExists, getFileTokens, findBlockTokens, headingInfo} = require('../utils');
const log = require('../log');

const TITLE_REF_REGEXP = /\[!TITLE( .+)?]/;

function defaultTransformLink(href) {
    const parsed = url.parse(href);

    return url.format({
        ...parsed,
        pathname: parsed.pathname.replace(/\.md$/, '.html')
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

function processLink(state, idx, opts) {
    const linkToken = state.tokens[idx];
    const nextToken = state.tokens[idx + 1];
    const href = linkToken.attrGet('href');

    if (!href) {
        log.warn(`Empty link in ${bold(opts.path)}`);
        return;
    }

    const {pathname, hash} = url.parse(href);
    let file;
    let fileExists;

    if (!isLocalUrl(href)) {
        return;
    }

    if (pathname) {
        if (!pathname.endsWith('.md')) {
            return;
        }

        file = path.resolve(path.parse(opts.path).dir, pathname);
        fileExists = isFileExists(file);

        if (!fileExists) {
            log.warn(`Link is not reachable: ${bold(href)} in ${bold(opts.path)}`);
        }
    } else if (hash) {
        file = opts.path;
        fileExists = true;
    } else {
        return;
    }

    const isEmptyLink = nextToken.type === 'link_close';
    const isTitleRefLink = nextToken.type === 'text' && nextToken.content.match(TITLE_REF_REGEXP);
    if ((isEmptyLink || isTitleRefLink) && fileExists) {
        state.env.linksProcessing = true;
        const id = hash && hash.slice(1);
        const fileTokens = getFileTokens(file, state);
        const sourceTokens = id ? findBlockTokens(fileTokens, id) : fileTokens;
        const title = getTitleFromTokens(sourceTokens);
        state.env.linksProcessing = false;

        if (title) {
            let textToken;

            if (isEmptyLink) {
                textToken = new state.Token('text', '', 0);
                state.tokens.splice(idx + 1, 0, textToken);
            } else {
                textToken = nextToken;
            }

            textToken.content = title;
        } else {
            log.warn(`Title not found: ${bold(href)} in ${bold(opts.path)}`);
        }
    }

    if (pathname) {
        const transformer = opts.transformLink || defaultTransformLink;
        linkToken.attrSet('href', transformer(href));
    }
}

module.exports = function links(md, opts) {
    md.inline.ruler2.push('links', (state) => {
        if (state.env.linksProcessing) {
            return;
        }

        let i = 0;

        while (i < state.tokens.length) {
            if (state.tokens[i].type === 'link_open') {
                processLink(state, i, opts);
            }

            i++;
        }
    });
};
