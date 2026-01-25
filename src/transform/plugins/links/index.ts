import type Token from 'markdown-it/lib/token';
import type {Logger} from 'src/transform/log';
import type {CacheContext, StateCore} from '../../typings';
import type {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import type {MarkdownItIncluded} from '../includes/types';

import url from 'url';
import {bold} from 'chalk';
import path, {isAbsolute, parse, relative, resolve} from 'path';

import {
    PAGE_LINK_REGEXP,
    defaultTransformLink,
    findBlockTokens,
    getHrefTokenAttr,
    headingInfo,
    isLocalUrl,
} from '../../utils';
import {getFileTokens, isFileExists} from '../../utilsFS';

function getTitleFromTokens(tokens: Token[]) {
    let title = '';

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        if (token?.type === 'heading_open') {
            const info = headingInfo(tokens, i);
            title = info?.title ?? '';

            break;
        }

        i += 1;
    }

    return title;
}

type Options = {
    hash: string | null;
    file: string;
    state: StateCore;
    opts: object;
    isEmptyLink: boolean;
    tokens: Token[];
    idx: number;
    nextToken: Token;
    href: string;
    currentPath: string;
    log: Logger;
    cache?: CacheContext;
};

const getTitle = (md: MarkdownItIncluded, id: string | null, options: Options) => {
    const {file, state, opts} = options;

    // Check the existed included store and extract it
    const included = md.included?.[file];

    const fileTokens = getFileTokens(
        file,
        state,
        {
            ...opts,
            disableLint: true,
            disableTitleRefSubstitution: true,
            disableCircularError: true,
            inheritVars: false,
        },
        included,
    );
    const sourceTokens = id ? findBlockTokens(fileTokens, id) : fileTokens;
    return getTitleFromTokens(sourceTokens);
};

const addTitle = (md: MarkdownItIncluded, options: Options) => {
    const {hash, state, isEmptyLink, tokens, idx, nextToken, href, currentPath, log, cache} =
        options;

    const id = hash && hash.slice(1);
    const key = [id, path].join('::');
    const title = cache?.get(key) ?? getTitle(md, id, options);
    cache?.set(key, title);

    if (title) {
        let textToken;

        if (isEmptyLink) {
            textToken = new state.Token('text', '', 0);
            tokens.splice(idx + 1, 0, textToken);
        } else {
            textToken = nextToken;
        }

        textToken.content = title;
    } else {
        log.warn(`Title not found: ${bold(href)} in ${bold(currentPath)}`);
    }
};

interface ProcOpts extends MarkdownItPluginOpts {
    transformLink: (v: string) => string;
    notFoundCb: (v: string) => void;
    needSkipLinkFn: (v: string) => boolean;
    getPublicPath: (options: ProcOpts, v?: string) => string;
}

function getDefaultPublicPath(
    {
        file,
        path,
    }: {
        file?: string;
        path?: string;
    },
    input?: string | null,
) {
    const relativePath = relative(parse(path || '').dir, input || file || '');
    // Normalize path separators to forward slashes for cross-platform compatibility
    return relativePath.replace(/\\/g, '/');
}

// eslint-disable-next-line complexity
function processLink(
    md: MarkdownItIncluded,
    state: StateCore,
    tokens: Token[],
    idx: number,
    opts: ProcOpts,
) {
    const {
        path: startPath,
        root,
        transformLink,
        notFoundCb,
        needSkipLinkFn,
        log,
        getPublicPath = getDefaultPublicPath,
        cache,
        skipLinkFileCheck = false,
    } = opts;

    const currentPath = state.env.path || startPath;
    const linkToken = tokens[idx];
    const nextToken = tokens[idx + 1];

    const originalHref = getHrefTokenAttr(linkToken);

    if (!originalHref) {
        log.error(`Empty link in ${bold(startPath)}`);
        return;
    }

    const {pathname, hash} = url.parse(originalHref);
    let file;
    let fileExists;
    let isPageFile;

    if (!isLocalUrl(originalHref)) {
        linkToken.attrSet('target', '_blank');
        linkToken.attrSet('rel', 'noreferrer noopener');
        return;
    }

    if (pathname) {
        file = resolve(path.parse(currentPath).dir, pathname);
        fileExists = skipLinkFileCheck || isFileExists(file);
        isPageFile = PAGE_LINK_REGEXP.test(pathname);

        if (isPageFile && !fileExists) {
            let needShowError = true;
            if (needSkipLinkFn) {
                needShowError = !needSkipLinkFn(originalHref);
            }

            if (notFoundCb && needShowError) {
                const relativePath = file.replace(root, '');
                // Normalize path separators to forward slashes for cross-platform compatibility
                notFoundCb(relativePath.replace(/\\/g, '/'));
            }

            if (needShowError) {
                log.error(`Link is unreachable: ${bold(originalHref)} in ${bold(currentPath)}`);
            }
        }
    } else if (hash) {
        file = startPath;
        fileExists = true;
        isPageFile = true;
    } else {
        return;
    }

    const isEmptyLink = nextToken.type === 'link_close';
    const isTitleRefLink = nextToken.type === 'text' && nextToken.content === '{#T}';
    if (
        (isEmptyLink || isTitleRefLink) &&
        fileExists &&
        isPageFile &&
        !state.env.disableTitleRefSubstitution
    ) {
        addTitle(md, {
            hash,
            file,
            state,
            opts,
            isEmptyLink,
            tokens,
            idx,
            nextToken,
            href: originalHref,
            currentPath,
            log,
            cache,
        });
    }

    const patchedHref =
        !isAbsolute(originalHref) && !originalHref.includes('//')
            ? url.format({
                  ...url.parse(originalHref),
                  pathname: getPublicPath(opts, file),
              })
            : originalHref;
    const linkHrefTransformer = transformLink || defaultTransformLink;

    linkToken.attrSet('href', linkHrefTransformer(patchedHref));
}

const index: MarkdownItPluginCb<ProcOpts & Options> = (md: MarkdownItIncluded, opts) => {
    const plugin = (state: StateCore) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            if (tokens[i].type === 'inline') {
                const childrenTokens = tokens[i].children || [];
                let j = 0;

                while (j < childrenTokens.length) {
                    const token = childrenTokens[j];

                    const isLinkOpenToken = token.type === 'link_open';
                    const tokenClass = token.attrGet('class');

                    /*  Don't process anchor links */
                    const isYfmAnchor = tokenClass ? tokenClass.includes('yfm-anchor') : false;
                    const wasProcessedBefore = Boolean(token.meta?.yfmLinkPluginProcessed);

                    if (isLinkOpenToken && !wasProcessedBefore && !isYfmAnchor) {
                        processLink(md, state, childrenTokens, j, opts);

                        token.meta ??= {};
                        token.meta.yfmLinkPluginProcessed = true;
                    }

                    j++;
                }
            }

            i++;
        }
    };

    try {
        md.core.ruler.before('includes', 'links', plugin);
    } catch {
        md.core.ruler.push('links', plugin);
    }
};

export = index;
