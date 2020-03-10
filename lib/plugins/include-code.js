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
    const keywords = {};
    while (content) {
        const match = TAG_CONTENT_RE.exec(content);
        if (match) {
            if (match.groups.quote1) {
                args.push(match.groups.quote1);
            } else if (match.groups.quote2) {
                args.push(match.groups.quote2);
            } else if (match.groups.key1) {
                keywords[match.groups.key1] = match.groups.value1;
            } else if (match.groups.key2) {
                keywords[match.groups.key2] = match.groups.value2;
            } else {
                log.warn(`Unrecognized lexeme encountered at ${content}`);
            }
            content = match.groups.rest;
        } else {
            content = null;
        }
    }

    const EXPECTED_POSITIONAL_ARGS = 1;
    if (args.length > EXPECTED_POSITIONAL_ARGS) {
        log.warn(`Got more than ${EXPECTED_POSITIONAL_ARGS} positional args, excessive args are not going to work.`);
    }

    const EXPECTED_KEYWORD_ARGS = ['lang', 'lines'];
    EXPECTED_KEYWORD_ARGS.forEach((key) => {
        args[key] = keywords[key];
        delete keywords[key];
    });
    const excessiveKeys = Object.keys(keywords);
    if (excessiveKeys.length > 0) {
        log.warn(`Got unexpected keyword arguments: ${excessiveKeys}. They are not going to work.`);
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

        if (
            openToken.type === 'paragraph_open' &&
            contentToken.type === 'inline' &&
            closeToken.type === 'paragraph_close'
        ) {
            const match = matchTag(contentToken.content);
            const includePath = match && match[0];
            if (includePath) {
                const {lang = '', lines = ''} = match;
                const fullIncludePath = getFullIncludePath(includePath, root, path);
                try {
                    if (!fullIncludePath.startsWith(root)) {
                        i++;

                        continue;
                    }

                    const includedTokens = getSourceTokens(fullIncludePath, state, {
                        lang,
                        lines,
                        includePath,
                    });
                    tokens.splice(i, 3, ...includedTokens);

                    i += includedTokens.length;
                    continue;
                } catch (e) {
                    if (notFoundCb) {
                        notFoundCb(fullIncludePath.replace(root, ''));
                    }
                    log.error(`Skip error: ${e}`);
                }
            }
        }
        i++;
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
    matchTag,
};
