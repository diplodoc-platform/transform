import url from 'url';
import {bold} from 'chalk';
import Token from 'markdown-it/lib/token';
import path, {isAbsolute, parse, relative, resolve} from 'path';

import {Logger} from 'src/transform/log';

import {
    PAGE_LINK_REGEXP,
    defaultTransformLink,
    findBlockTokens,
    getHrefTokenAttr,
    headingInfo,
    isLocalUrl,
} from '../../utils';
import {getFileTokens, isFileExists} from '../../utilsFS';
import {CacheContext, StateCore} from '../../typings';
import {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import {MarkdownItIncluded} from '../includes/types';

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
    return relative(parse(path || '').dir, input || file || '');
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
    } = opts;

    const currentPath = state.env.path || startPath;
    const linkToken = tokens[idx];
    const nextToken = tokens[idx + 1];

    let href = getHrefTokenAttr(linkToken);

    if (!href) {
        log.error(`Empty link in ${bold(startPath)}`);
        return;
    }

    const {pathname, hash} = url.parse(href);
    let file;
    let fileExists;
    let isPageFile;

    if (!isLocalUrl(href)) {
        linkToken.attrSet('target', '_blank');
        linkToken.attrSet('rel', 'noreferrer noopener');
        return;
    }

    if (pathname) {
        file = resolve(path.parse(currentPath).dir, pathname);
        fileExists = isFileExists(file);
        isPageFile = PAGE_LINK_REGEXP.test(pathname);

        if (isPageFile && !fileExists) {
            let needShowError = true;
            if (needSkipLinkFn) {
                needShowError = !needSkipLinkFn(href);
            }

            if (notFoundCb && needShowError) {
                notFoundCb(file.replace(root, ''));
            }

            if (needShowError) {
                log.error(`Link is unreachable: ${bold(href)} in ${bold(currentPath)}`);
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
            href,
            currentPath,
            log,
            cache,
        });
    }

    let newPathname = '';

    if (!isAbsolute(href) && !href.includes('//')) {
        newPathname = getPublicPath(opts, file);

        href = url.format({
            ...url.parse(href),
            pathname: newPathname,
        });
    }

    if (pathname || newPathname) {
        const transformer = transformLink || defaultTransformLink;
        linkToken.attrSet('href', transformer(href));
    }
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
                    const isLinkOpenToken = childrenTokens[j].type === 'link_open';
                    const tokenClass = childrenTokens[j].attrGet('class');

                    /*  Don't process anchor links */
                    const isYfmAnchor = tokenClass ? tokenClass.includes('yfm-anchor') : false;

                    if (isLinkOpenToken && !isYfmAnchor) {
                        processLink(md, state, childrenTokens, j, opts);
                    }

                    j++;
                }
            }

            i++;
        }
    };

    try {
        md.core.ruler.before('includes', 'links', plugin);
    } catch (e) {
        md.core.ruler.push('links', plugin);
    }
};

export = index;
