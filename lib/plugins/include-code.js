const log = require('../log');
const {getFullIncludePath, getSourceTokens} = require('../utils');

const TAG_LEGACY_RE = /^{%\s*include\s*literal\s(?<content>[^%}]+)%}/;
const TAG_RE = /^{%\s*code\s(?<content>[^%}]+)%}/;
/* eslint-disable-next-line max-len */
const TAG_CONTENT_RE = /^\s*("(?<quote1>[^"]+)"|'(?<quote2>[^']+)'|((?<key1>\w+)='(?<value1>[^']+)')|((?<key2>\w+)="(?<value2>[^"]+)"))(?<rest>.*)/;

function matchTag(text) {
    let content;
    let match = TAG_RE.exec(text);
    if (match) {
        content = match.groups.content;
    } else {
        match = TAG_LEGACY_RE.exec(text);
        if (match) {
            log.warn(`You are using legacy form of 'include' tag in line ${text}. Consider switching to 'code' tag.`);
            content = match.groups.content;
        }
    }
    const args = [];
    while (content) {
        const match = TAG_CONTENT_RE.exec(content);
        if (match) {
            if (match.groups.quote1) {
                args.push(match.groups.quote1);
            } else if (match.groups.quote2) {
                args.push(match.groups.quote2);
            } else if (match.groups.key1) {
                args[match.groups.key1] = match.groups.value1;
            } else if (match.groups.key2) {
                args[match.groups.key2] = match.groups.value2;
            } else {
                log.warn(`Unrecognized lexeme encountered at ${content}`);
            }
            content = match.groups.rest;
        } else {
            content = null;
        }
    }
    return args;
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
            (match = matchTag(contentToken.content)) &&
            closeToken.type === 'paragraph_close'
        ) {
            try {
                const includePath = match[0];
                const {lang = '', lines = ''} = match;
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
    matchTag
};
