import Token from 'markdown-it/lib/token';

export function isLocalUrl(url: string) {
    return !/^(?:[a-z]+:)?\/\//i.test(url);
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
            if (startToken.type === 'paragraph_open' && token.type === 'paragraph_close') {
                end = i + 1;
                break;
            } else if (startToken.type === 'heading_open') {
                if (token.type === 'heading_open' && token.tag === startToken.tag) {
                    end = i;
                    break;
                } else if (i === tokens.length - 1) {
                    end = tokens.length;
                }
            }
        }

        if (
            (token.type === 'paragraph_open' || token.type === 'heading_open') &&
            token.attrGet('id') === id &&
            typeof start === 'undefined'
        ) {
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

export function headingInfo(tokens: Token[], idx: number) {
    const openToken = tokens[idx];
    const inlineToken = tokens[idx + 1];

    let lastTextToken,
        i = 0;
    while (inlineToken.children && i < inlineToken.children.length) {
        const token = inlineToken.children[i];

        if (token.type === 'text') {
            lastTextToken = token;
        }

        i++;
    }

    const level = Number.parseInt(openToken.tag.slice(1), 10);
    const title = (lastTextToken && lastTextToken.content) || inlineToken.content;

    return {
        level,
        title,
    };
}

export function isExternalHref(href: string) {
    return href.startsWith('http') || href.startsWith('//');
}

export function transformLinkToOriginalArticle(opts: {root: string; currentPath: string}) {
    const {root, currentPath} = opts;

    return currentPath.replace(root, '').replace(/\.(md|ya?ml|html)$/i, '');
}

export function getHrefTokenAttr(token: Token) {
    let href = token.attrGet('href') || '';
    try {
        href = decodeURI(href);
    } catch (e) {}

    return href;
}
