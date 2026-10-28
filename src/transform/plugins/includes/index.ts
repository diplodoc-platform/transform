import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {StateCore} from '../../typings';
import type {GetFileTokensOpts} from '../../utilsFS';
import type {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import type {MarkdownItIncluded} from './types';

import {bold} from 'chalk';

import {materializeFootnoteTokens} from '../../footnote-data';
import {replayChildDocument} from '../../document-context';
import {IncludeCycleError} from '../../document';
import {findBlockTokens} from '../../utils';
import {getFileFragment, getFullIncludePath, getRealPath, isFileExists} from '../../utilsFS';

import {createIncludeRegExp} from './syntax';

const INCLUDE_REGEXP = createIncludeRegExp();

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
                const included = state.env.included?.[pathname];

                const fragment = getFileFragment(
                    pathname,
                    state,
                    {...options, purpose: 'reference'},
                    included,
                );
                const fileTokens = fragment.tokens;

                let includedTokens;
                if (hash) {
                    // TODO: add warning about missed block
                    includedTokens = findBlockTokens(fileTokens, hash);
                } else {
                    includedTokens = fileTokens.slice();
                }

                if (keyword === 'notitle') {
                    stripTitleTokens(includedTokens);
                }

                includedTokens = materializeFootnoteTokens(fileTokens, includedTokens, openToken);
                replayChildDocument(state.md, fragment, state.env, {purpose: 'include'});

                if (noReplaceInclude) {
                    i++;
                } else {
                    tokens.splice(i, 3, ...includedTokens);

                    i += includedTokens.length;
                }
            } catch (e) {
                if (e instanceof IncludeCycleError) {
                    throw e;
                }
                // @ts-ignore for some reason typescript fails here
                const errPath = e.path?.replace(root, '');
                // Normalize path separators to forward slashes for cross-platform compatibility
                const normalizedPath = errPath ? errPath.replace(/\\/g, '/') : errPath;

                if (notFoundCb) {
                    notFoundCb(normalizedPath);
                }
                log.error(`Skip error: ${e} in ${normalizedPath}`);

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
            throw new IncludeCycleError(env.includes.concat(path));
        }

        env.includes.push(path);
        try {
            unfoldIncludes(state, path, options);
        } finally {
            env.includes.pop();
        }
    };

    try {
        md.core.ruler.before('curly_attributes', 'includes', plugin);
    } catch {
        // Keep includes before linkification and later term processing without general attrs.
        md.core.ruler.before('linkify', 'includes', plugin);
    }
};

export default index;
