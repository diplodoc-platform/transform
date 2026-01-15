import type Token from 'markdown-it/lib/token';
import type {StateCore} from '../../typings';
import type {GetFileTokensOpts} from '../../utilsFS';
import type {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import type {MarkdownItIncluded} from './types';

import {bold} from 'chalk';

import {findBlockTokens} from '../../utils';
import {getFileTokens, getFullIncludePath, getRealPath, isFileExists} from '../../utilsFS';

const INCLUDE_REGEXP = /^{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}$/;

function stripTitleTokens(tokens: Token[]) {
    const [open, _, close] = tokens;

    if (open?.type === 'heading_open' && close?.type === 'heading_close') {
        tokens.splice(0, 3);
    }
}

type Options = MarkdownItPluginOpts &
    GetFileTokensOpts & {
        notFoundCb: (v: string) => void;
        noReplaceInclude: boolean;
    };

function unfoldIncludes(md: MarkdownItIncluded, state: StateCore, path: string, options: Options) {
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

                // Check the real path of the file in case of a symlink
                let pathname = getRealPath(fullIncludePath);

                if (!pathname.startsWith(root)) {
                    i++;

                    continue;
                }

                let hash = '';
                const hashIndex = fullIncludePath.lastIndexOf('#');
                if (hashIndex > -1 && !isFileExists(pathname)) {
                    pathname = fullIncludePath.slice(0, hashIndex);
                    hash = fullIncludePath.slice(hashIndex + 1);
                }

                // Check the existed included store and extract it
                const included = md.included?.[pathname];

                const fileTokens = getFileTokens(pathname, state, options, included);

                let includedTokens;
                if (hash) {
                    // TODO: add warning about missed block
                    // TODO: findBlockTokens requires markdown-it-attrs plugin for find block with id=hash
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
                const errPath = e.path?.replace(root, '');

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

const index: MarkdownItPluginCb<Options> = (md: MarkdownItIncluded, options) => {
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
        unfoldIncludes(md, state, path, options);
        env.includes.pop();
    };

    try {
        md.core.ruler.before('curly_attributes', 'includes', plugin);
    } catch {
        md.core.ruler.push('includes', plugin);
    }
};

export = index;
