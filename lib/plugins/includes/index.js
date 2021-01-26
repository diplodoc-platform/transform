const {bold} = require('chalk');

const {getFileTokens, getFullIncludePath} = require('../../utilsFS');
const {findBlockTokens} = require('../../utils');

const INCLUDE_REGEXP = /^{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}$/;

function stripTitleTokens(tokens) {
    if (tokens[0].type === 'heading_open' && tokens[2].type === 'heading_close') {
        tokens.splice(0, 3);
    }
}

function unfoldIncludes(state, path, options) {
    const {root, notFoundCb, log} = options;
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
                const [, keyword, /* description */, includePath] = match;
                const fullIncludePath = getFullIncludePath(includePath, root, path);
                const [pathname, hash] = fullIncludePath.split('#');

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

function index(md, options) {
    const {path: optPath, log} = options;

    const plugin = (state) => {
        const {env} = state;
        const path = env.path || optPath;

        env.includes = env.includes || [];

        if (env.includes.includes(path)) {
            log.error(`Circular includes: ${bold(env.includes.concat(path).join(' ▶ '))}`);
            process.exit(1);
        }

        env.includes.push(path);
        unfoldIncludes(state, path, options);
        env.includes.pop();
    };

    try {
        md.core.ruler.before('curly_attributes', 'includes', plugin);
    } catch (e) {
        md.core.ruler.push('includes', plugin);
    }
}

module.exports = index;
