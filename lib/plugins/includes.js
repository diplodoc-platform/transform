const {bold} = require('chalk');
const {relative} = require('path');

const {getFileTokens, findBlockTokens, getFullIncludePath, resolveRelativePath} = require('../utils');

const INCLUDE_REGEXP = /^{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}$/;

function stripTitleTokens(tokens) {
    if (tokens[0].type === 'heading_open' && tokens[2].type === 'heading_close') {
        tokens.splice(0, 3);
    }
}

function unfoldIncludes(state, path, options) {
    const {root, notFoundCb, log, noReplaceInclude = false} = options;
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

                if (noReplaceInclude) {
                    i++;
                } else {
                    tokens.splice(i, 3, ...includedTokens);

                    i += includedTokens.length;
                }
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

function includes(md, options) {
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

const includesPaths = [];

// eslint-disable-next-line consistent-return
includes.collect = (input, options) => {
    const {root, path, destPath = '', log, copyFile, singlePage} = options;
    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match, result = input;

    while ((match = INCLUDE_REGEXP.exec(result)) !== null) {
        let [,,, relativePath] = match;
        const [matchedInclude] = match;

        relativePath = relativePath.split('#')[0];

        const includePath = resolveRelativePath(path, relativePath);
        const targetDestPath = resolveRelativePath(destPath, relativePath);

        if (includesPaths.includes(includePath)) {
            log.error(`Circular includes: ${bold(includesPaths.concat(path).join(' ▶ '))}`);
            break;
        }

        if (singlePage && !path.includes('_includes/')) {
            const newRelativePath = relative(root, includePath);
            const newInclude = matchedInclude.replace(relativePath, newRelativePath);

            result = result.replace(matchedInclude, newInclude);
        }

        includesPaths.push(includePath);
        const includeOptions = {
            ...options,
            path: includePath,
            destPath: targetDestPath,
        };

        try {
            copyFile(includePath, targetDestPath, includeOptions);
        } catch (e) {
            log.error(`No such file or has no access to ${bold(includePath)} in ${bold(path)}`);
        } finally {
            includesPaths.pop();
        }
    }

    if (singlePage) {
        return result;
    }
};

module.exports = includes;
