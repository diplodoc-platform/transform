'use strict';
const {resolveRelativePath, getFileTokens, findBlockTokens} = require('../utils');

const INCLUDE_REGEXP = /^\[!INCLUDE\s+\[(.+)]\((.+)\)]$/;

function createIncludes(filePath) {
    return function includes(state) {
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
                const relativePath = match[2];
                const includePath = resolveRelativePath(filePath, relativePath);
                const [pathname, hash] = includePath.split('#');
                const fileTokens = getFileTokens(pathname, state);
                let includedTokens;

                if (hash) {
                    includedTokens = findBlockTokens(fileTokens, hash);
                } else {
                    includedTokens = fileTokens;
                }

                tokens.splice(i, 3, ...includedTokens);

                i += includedTokens.length;
            } else {
                i++;
            }
        }
    };
}

module.exports = function (md, path) {
    md.core.ruler.push('includes', createIncludes(path));
};
