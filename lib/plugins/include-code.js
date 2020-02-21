const log = require('../log');
const {getFullIncludePath, getSourceTokens} = require('../utils');

const TAG_REGEXP_LEGACY =
    /^{%\s*include\s*literal\s*'(?<path>[^']+)'\s*(lang='(?<lang>[a-z]+)')?\s*(lines='(?<lines>[^']+)')?\s*%}$/;
const TAG_REGEXP = /^{%\s*code\s*'(?<path>[^']+)'\s*(lang='(?<lang>[a-z]+)')?\s*(lines='(?<lines>[^']+)')?\s*%}$/;

function getCodeTagMatch(text) {
    let match = TAG_REGEXP.exec(text);
    if (match) {
        return match;
    }

    match = TAG_REGEXP_LEGACY.exec(text);
    if (match) {
        log.warn(`You are using legacy form of 'include' tag in line ${text}. Consider switching to 'code' tag.`);
    }

    return match;
}

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
            (match = getCodeTagMatch(contentToken.content)) &&
            closeToken.type === 'paragraph_close'
        ) {
            try {
                const {path: includePath, lang, lines} = match.groups;
                const [startMarker, endMarker] = lines.split('-');
                const fullIncludePath = getFullIncludePath(includePath, root, path);

                if (!fullIncludePath.startsWith(root)) {
                    i++;

                    continue;
                }

                const includedTokens = getSourceTokens(fullIncludePath, state, {
                    lang,
                    startMarker,
                    endMarker,
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

module.exports = {
    plugin: function includes(md, options) {
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
    },
    getCodeTagMatch: getCodeTagMatch,
};
