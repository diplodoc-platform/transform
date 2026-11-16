//
// Utils for working with custom ids in heading tokens
//

import type {Token} from 'markdown-it';

import escapeRegExp from 'lodash/escapeRegExp';

/**
 * Detect empty shorthand IDs in terminal attributes using the parser's space separator.
 * @param content - The final text token before attributes are parsed.
 * @param left - Opening attribute delimiter.
 * @param right - Closing attribute delimiter.
 * @returns Whether a shorthand ID block contains an empty ID.
 */
export const hasEmptyShorthandId = (content: string, left = '{', right = '}') => {
    const open = escapeRegExp(left);
    const close = escapeRegExp(right);
    const block = new RegExp(`${open}((?:[^"${open}${close}]|"[^"]*")*)${close}\\s*$`);
    const match = content.match(block);
    if (!match) {
        return false;
    }

    const attributes: string[] = match[1].match(/(?:[^ "]+|"[^"]*")+/g) || [];
    return attributes.includes('#');
};

/**
 * Remove boundary whitespace left by attributes, not spaces inside inline markup.
 * @param token - The heading inline token.
 * @returns Nothing; only boundary text tokens are updated.
 */
export const trimHeadingWhitespace = (token: Token) => {
    const children = token.children || [];
    const first = children[0];
    const last = children[children.length - 1];
    if (first?.type === 'text') {
        first.content = first.content.trimStart();
    }
    if (last?.type === 'text') {
        last.content = last.content.trimEnd();
    }
};

export const CUSTOM_ID_REGEXP = /\[?{[ \t]*#([^\s{}]+)[ \t]*}]?/g;
export const CUSTOM_ID_EXCEPTION = '[{#T}]';

export const getCustomIds = (content: string | Token) => {
    const match =
        typeof content === 'string'
            ? findTrailingMatch(content, CUSTOM_ID_REGEXP, true, CUSTOM_ID_EXCEPTION)
            : findHeadingMatch(content, CUSTOM_ID_REGEXP, CUSTOM_ID_EXCEPTION)?.match;
    return match ? [match[1]] : null;
};

export const removeCustomId = (content: string) => {
    const match = findTrailingMatch(content, CUSTOM_ID_REGEXP, true, CUSTOM_ID_EXCEPTION);
    return match ? content.slice(0, match.index).trimEnd() : content;
};

export const removeCustomIds = (token: Token) => {
    const suffix = findHeadingMatch(token, CUSTOM_ID_REGEXP, CUSTOM_ID_EXCEPTION);
    if (!suffix || !token.children) {
        return;
    }

    token.content = removeCustomId(token.content);
    const child = token.children[suffix.index];
    child.content = child.content.slice(0, suffix.match.index).trimEnd();
    if (!child.content && isHeadingSeparator(token.children[suffix.index - 1])) {
        token.children.splice(suffix.index - 1);
    }
    trimHeadingWhitespace(token);
};

export const getHeadingAttributeSuffix = (token: Token, left = '{', right = '}') => {
    const open = escapeRegExp(left);
    const close = escapeRegExp(right);
    const pattern = new RegExp(`${open}[^${open}${close}]*${close}`, 'g');
    return findHeadingMatch(token, pattern);
};

function findHeadingMatch(token: Token, pattern: RegExp, exception?: string) {
    const children = token.children || [];
    const index = children.length - 1;
    const child = children[index];
    if (child?.type !== 'text') {
        return undefined;
    }

    const match = findTrailingMatch(
        child.content,
        pattern,
        index === 0 || isHeadingSeparator(children[index - 1]),
        exception,
    );
    return match ? {index, match} : undefined;
}

function findTrailingMatch(
    content: string,
    pattern: RegExp,
    allowStart = true,
    exception?: string,
) {
    const match = new RegExp(`${pattern.source}$`).exec(content.trimEnd());
    if (!match || match[0] === exception) {
        return undefined;
    }

    const start = match.index;
    const separated = start
        ? /\s/.test(content[start - 1]) || /(?:^|\s|}){[^{}]*}$/.test(content.slice(0, start))
        : allowStart;
    return separated ? match : undefined;
}

function isHeadingSeparator(token: Token | undefined) {
    return token?.type === 'softbreak' || token?.type === 'hardbreak';
}
