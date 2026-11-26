import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};

import {formatHref, parseHref} from '@diplodoc/utils';

import {matchesCustomHeadingId} from './heading-id';
import {isFootnoteBody} from './footnote-data';

export function isLocalUrl(url: string) {
    // A URL is local unless it has an external scheme: either `scheme://...`
    // / `//host...` (protocol-relative), or an opaque scheme URI without
    // a slash-slash part (e.g. `mailto:`, `tel:`, `custom:`).
    return !isExternalHref(url);
}

export function findBlockTokens(tokens: Token[], id: string) {
    let blockTokens: Token[] = [];
    let i = 0,
        startToken,
        start,
        end;
    while (i < tokens.length) {
        const token = tokens[i];

        if (typeof start === 'number' && startToken) {
            const boundary = findBlockBoundary(startToken, token, i);
            if (typeof boundary === 'number') {
                end = boundary;
                break;
            }
            if (startToken.type === 'heading_open' && i === tokens.length - 1) {
                end = tokens.length;
            }
        }

        if (matchesBlockId(tokens, i, id) && typeof start === 'undefined') {
            startToken = token;
            start = i;
        }

        i++;
    }

    if (typeof start === 'number' && typeof end === 'number') {
        blockTokens = tokens.slice(start, end);
    }

    return blockTokens;
}

function findBlockBoundary(start: Token, token: Token, index: number): number | undefined {
    if (start.type === 'paragraph_open' && token.type === 'paragraph_close') {
        return index + 1;
    }
    if (
        start.type === 'heading_open' &&
        token.type === 'heading_open' &&
        token.tag === start.tag &&
        !isFootnoteBody(token)
    ) {
        return index;
    }
    return undefined;
}

function matchesBlockId(tokens: Token[], index: number, id: string): boolean {
    const token = tokens[index];
    const explicitId = token.attrGet('id');
    // Child headings have no generated anchors yet. Recognize their existing
    // standalone IDs, including aliases, without consuming attributes or mutating tokens.
    const matchesHeadingId =
        token.type === 'heading_open' &&
        matchesCustomHeadingId(tokens[index + 1]?.content || '', id, String(explicitId ?? ''));
    return (
        (token.type === 'paragraph_open' || token.type === 'heading_open') &&
        !isFootnoteBody(token) &&
        (explicitId === id || matchesHeadingId)
    );
}

export function headingInfo(tokens: Token[], idx: number) {
    const openToken = tokens[idx];
    const inlineToken = tokens[idx + 1];

    let title = '',
        i = 0;
    while (inlineToken.children && i < inlineToken.children.length) {
        const token = inlineToken.children[i];

        if (token.type === 'text' || token.type === 'text_special') {
            title += token.content;
        }

        i++;
    }

    const level = Number.parseInt(openToken.tag.slice(1), 10);
    title ||= inlineToken.content;

    return {
        level,
        title,
    };
}

export function isExternalHref(href: string) {
    return /^(\w{1,10}:)?\/\//.test(href) || /^([+\w]{1,10}:)/.test(href);
}

export function transformLinkToOriginalArticle(opts: {root: string; currentPath: string}) {
    const {root, currentPath} = opts;

    return currentPath.replace(root, '').replace(/\.(md|ya?ml|html)$/i, '');
}

export function getHrefTokenAttr(token: Token) {
    let href = String(token.attrGet('href') ?? '');
    try {
        href = decodeURI(href);
    } catch {}

    return href;
}

export function getSrcTokenAttr(token: Token) {
    let src = String(token.attrGet('src') ?? '');
    try {
        // decodeURI can throw an error https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/URIError
        src = decodeURI(src);
    } catch {}

    return src;
}

export const PAGE_LINK_REGEXP = /\.(md|ya?ml)$/i;

export function defaultTransformLink(href: string) {
    const parsed = parseHref(href);
    href = formatHref({
        ...parsed,
        pathname: parsed.pathname?.replace(PAGE_LINK_REGEXP, '.html'),
    });

    return href;
}

type TokenWalker = (
    token: Token,
    state: {commented: boolean; index: number},
) => void | undefined | {skip: number};

export function filterTokens(tokens: Token[], type: string, handler: TokenWalker) {
    let commented = false;

    if (!tokens || !tokens.length) {
        return;
    }

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];

        if (token.type === 'html_block') {
            const commentStart = token.content.match('<!--');
            const commentEnd = token.content.match('-->');

            if (commentStart && !commentEnd) {
                commented = true;
            }

            if (!commentStart && commentEnd) {
                commented = false;
            }
        }

        if (token.type === type) {
            const result = handler(token, {commented, index});
            if (result?.skip) {
                index += result?.skip - 1;
            }
        }
    }
}
