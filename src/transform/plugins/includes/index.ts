import {bold} from 'chalk';

import {getFileTokens, GetFileTokensOpts, getFullIncludePath} from '../../utilsFS';
import {findBlockTokens} from '../../utils';
import Token from 'markdown-it/lib/token';
import {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import {StateCore} from 'src/transform/typings';

const INCLUDE_REGEXP = /^{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}$/;

function stripTitleTokens(tokens: Token[]) {
    if (tokens[0].type === 'heading_open' && tokens[2].type === 'heading_close') {
        tokens.splice(0, 3);
    }
}

type Options = MarkdownItPluginOpts &
    GetFileTokensOpts & {
        notFoundCb: (v: string) => void;
        noReplaceInclude: boolean;
    };

function unfoldIncludes(state: StateCore, path: string, options: Options) {
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
                const [, keyword /* description */, , includePath] = match;
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
                // @ts-ignore for some reason typescript fails here
                const errPath = e.path.replace(root, '');

                if (notFoundCb) {
                    notFoundCb(errPath);
                }
                log.error(`Skip error: ${e} in ${errPath}`);

                i++;
            }
        } else {
            i++;
        }
    }
}

const index: MarkdownItPluginCb<Options> = (md, options) => {
    const {path: optPath, log} = options;

    const plugin = (state: StateCore) => {
        const {env} = state;
        const path = env.path || optPath;

        env.includes = env.includes || [];

        const isCircularInclude = env.includes.includes(path);

        if (isCircularInclude && state.env.disableCircularError) {
            return;
        }

        if (isCircularInclude) {
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
};

export = index;
