import url from 'url';
import {bold} from 'chalk';
import {isLocalUrl, findBlockTokens, headingInfo, getHrefTokenAttr} from '../../utils';
import {isFileExists, getFileTokens} from '../../utilsFS';
import {PAGE_LINK_REGEXP} from './constants';
import Token from 'markdown-it/lib/token';
import {Logger} from 'src/transform/log';
import {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import path, {parse, relative, resolve} from 'path';
import {StateCore} from 'src/transform/typings';

function defaultTransformLink(href: string) {
    const parsed = url.parse(href);

    return url.format({
        ...parsed,
        pathname: parsed.pathname?.replace(PAGE_LINK_REGEXP, '.html'),
    });
}

function getTitleFromTokens(tokens: Token[]) {
    let title = '';

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        if (token.type === 'heading_open') {
            ({title = ''} = headingInfo(tokens, i));

            break;
        }

        i += 2;
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
};

const addTitle = (options: Options) => {
    const {hash, file, state, opts, isEmptyLink, tokens, idx, nextToken, href, currentPath, log} =
        options;

    const id = hash && hash.slice(1);
    const fileTokens = getFileTokens(file, state, {
        ...opts,
        disableLint: true,
        disableTitleRefSubstitution: true,
        disableCircularError: true,
        inheritVars: false,
    });
    const sourceTokens = id ? findBlockTokens(fileTokens, id) : fileTokens;
    const title = getTitleFromTokens(sourceTokens);

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
}

// eslint-disable-next-line complexity
function processLink(state: StateCore, tokens: Token[], idx: number, opts: ProcOpts) {
    const {path: startPath, root, transformLink, notFoundCb, needSkipLinkFn, log} = opts;
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
        addTitle({
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
        });
    }

    let newPathname = '';
    if (currentPath !== startPath) {
        newPathname = relative(parse(startPath).dir, file);

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

const index: MarkdownItPluginCb<ProcOpts & Options> = (md, opts) => {
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
                        processLink(state, childrenTokens, j, opts);
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
