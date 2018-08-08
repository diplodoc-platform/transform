'use strict';
const path = require('path');
const url = require('url');
const {getFileTokens, findBlockTokens, headingInfo} = require('../utils');

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

function createLinks(opts) {
    const {dir: fileDir} = path.parse(opts.path);
    const transformLink = opts.transformLink || defaultTransformLink;

    return function links(state) {
        if (state.env.linksProcessing) {
            return;
        }

        let i = 0;
        while (i < state.tokens.length) {
            const token = state.tokens[i];
            let nextToken = state.tokens[i + 1];
            const isLink = token.type === 'link_open';
            const href = isLink && token.attrs && token.attrs.find(([name]) => name === 'href');

            if (isLink && href) {
                const parsedHref = url.parse(href[1]);
                const id = parsedHref.hash && parsedHref.hash.slice(1);

                if (!parsedHref.protocol && !parsedHref.host && parsedHref.pathname) {
                    href[1] = transformLink(href[1]);
                }

                const isLinkCloseToken = nextToken.type === 'link_close';
                const isTitleRefToken = nextToken.type === 'text' && nextToken.content.match(TITLE_REF_REGEXP);
                if (isLinkCloseToken || isTitleRefToken) {
                    let fileNotExist;
                    let sourceTokens = [];

                    let refFilePath;
                    if (parsedHref.pathname) {
                        refFilePath = path.resolve(fileDir, parsedHref.pathname);
                    } else {
                        refFilePath = opts.path;
                    }

                    state.env.linksProcessing = true;
                    try {
                        const fileTokens = getFileTokens(refFilePath, state);

                        sourceTokens = id ? findBlockTokens(fileTokens, id) : fileTokens;
                    } catch (err) {
                        if (err.code === 'ENOENT') {
                            fileNotExist = true;
                        } else {
                            console.error(err);
                        }
                    }
                    state.env.linksProcessing = false;

                    const title = getTitleFromTokens(sourceTokens);

                    if (fileNotExist) {
                        console.error(`No such file for title resolving: ${refFilePath}`);
                    } else if (!title) {
                        console.error(`Couldn't resolve title "${nextToken.type === 'text' ? nextToken.content : ''}" in file: ${opts.path}`);
                    } else {
                        if (nextToken.type === 'link_close') {
                            nextToken = new state.Token('text', '', 0);
                            state.tokens.splice(i + 1, 0, nextToken);
                        }

                        nextToken.content = title;
                    }

                    // skip 'text' token
                    if (nextToken.type === 'text') {
                        i++;
                    }
                }

                // skip 'link_close' token
                i++;
            }

            i++;
        }
    };
}

module.exports = function (md, opts) {
    md.inline.ruler2.push('links', createLinks(opts));
};

