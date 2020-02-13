'use strict';
const log = require('../log');
const {resolveRelativePath, getSourceTokens} = require('../utils');

const INCLUDE_REGEXP = /^{%\s*code\s*'(?<path>[^']+)'\s*(lang='(?<lang>[a-z]+)')?\s*(lines='(?<lines>[^']+)')?\s*%}$/;

function unfoldIncludes(state, path, options) {
    const {root, notFoundCb} = options;
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
            try {
                const {path: relativePath, lang, lines} = match.groups;
                const [startMarker, endMarker] = lines.split('-');
                const includePath = resolveRelativePath(path, relativePath);

                if (!includePath.startsWith(root)) {
                    i++;

                    continue;
                }

                const includedTokens = getSourceTokens(includePath, state, {
                    lang,
                    startMarker,
                    endMarker
                });
                tokens.splice(i, 3, ...includedTokens);

                i += includedTokens.length;
            } catch (e) {
                if (notFoundCb) {
                    notFoundCb(e.path.replace(root, ''));
                }
                log.error(`Skip error: ${e}`);

                i++;
            }
        } else {
            i++;
        }
    }
}

module.exports = function includes(md, options) {
    const {path: optPath} = options;

    const plugin = (state) => {
        const {env} = state;
        const path = env.path || optPath;

        unfoldIncludes(state, path, options);
    };

    try {
        md.core.ruler.before('curly_attributes', 'includes', plugin);
    } catch (e) {
        md.core.ruler.push('includes', plugin);
    }
};
