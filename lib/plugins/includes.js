'use strict';
const {resolveRelativePath, getFileTokens, findBlockTokens} = require('../utils');

const INCLUDE_REGEXP = /^\[!(INCLUDE(?:-NOTITLE)?)\s+\[(.+?)]\((.+?)\)]$/;

function stripTitleTokens(tokens) {
    if (tokens[0].type === 'heading_open' && tokens[2].type === 'heading_close') {
        tokens.splice(0, 3);
    }
}

function unfoldIncludes(state, path) {
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
            const fileTokens = getFileTokens(pathname, state);

            let includedTokens;
            if (hash) {
                includedTokens = findBlockTokens(fileTokens, hash);
            } else {
                includedTokens = fileTokens;
            }

            if (keyword === 'INCLUDE-NOTITLE') {
                stripTitleTokens(includedTokens);
            }

            tokens.splice(i, 3, ...includedTokens);

            i += includedTokens.length;
        } else {
            i++;
        }
    }
}

module.exports = function includes(md, initialPath) {
    md.core.ruler.push('includes', (state) => {
        const {env} = state;
        const path = env.path || initialPath;

        if (env.includes) {
            if (env.includes.has(path)) {
                throw new Error(`Circular include has been detected in ${path}`);
            } else {
                env.includes.add(path);
            }
        } else {
            env.includes = new Set([path]);
        }

        unfoldIncludes(state, path);
    });
};
