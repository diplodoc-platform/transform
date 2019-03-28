'use strict';
const {bold} = require('chalk');
const log = require('../log');
const {resolveRelativePath, getFileTokens, findBlockTokens} = require('../utils');

const INCLUDE_REGEXP = /^{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}$/;

function stripTitleTokens(tokens) {
    if (tokens[0].type === 'heading_open' && tokens[2].type === 'heading_close') {
        tokens.splice(0, 3);
    }
}

function unfoldIncludes(state, path, options) {
    const {root} = options;
    const {tokens} = state;
    let i = 0;

    while (i < tokens.length) {
        const openToken = tokens[i];
        const contentToken = tokens[i + 1];
        const closeToken = tokens[i + 2];
        let match;

        if (
            openToken.type === 'paragraph_open' &&
            contentToken.type === 'inline' &&
            (match = contentToken.content.match(INCLUDE_REGEXP)) &&
            closeToken.type === 'paragraph_close'
        ) {
            const [, keyword, /* description */, relativePath] = match;
            const includePath = resolveRelativePath(path, relativePath);
            const [pathname, hash] = includePath.split('#');

            if (!pathname.startsWith(root)) {
                i++;

                continue;
            }

            const fileTokens = getFileTokens(pathname, state, options);

            let includedTokens;
            if (hash) {
                includedTokens = findBlockTokens(fileTokens, hash);
            } else {
                includedTokens = fileTokens;
            }

            if (keyword === 'notitle') {
                stripTitleTokens(includedTokens);
            }

            tokens.splice(i, 3, ...includedTokens);

            i += includedTokens.length;
        } else {
            i++;
        }
    }
}

module.exports = function includes(md, options) {
    const {path: optPath, notFoundCb, root} = options;

    md.core.ruler.push('includes', (state) => {
        const {env} = state;
        const path = env.path || optPath;

        env.includes = env.includes || [];

        if (env.includes.includes(path)) {
            log.error(`Circular includes: ${bold(env.includes.concat(path).join(' ▶ '))}`);
            process.exit(1);
        }

        env.includes.push(path);

        try {
            unfoldIncludes(state, path, options);
        } catch (e) {
            if (notFoundCb) {
                notFoundCb(e.path.replace(root, ''));
            }
            log.error(`Skip error: ${e}`);
        }
        env.includes.pop();
    });
};
