//
// Utils for working with custom ids in heading tokens
//

import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};

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

export const CUSTOM_ID_REGEXP = /\[?{ ?#(\S+) ?}]?/g;
export const CUSTOM_ID_EXCEPTION = '[{#T}]';

export const getCustomIds = (content: string) => {
    const ids: string[] = [];

    content.replace(CUSTOM_ID_REGEXP, (match, customId) => {
        if (match !== CUSTOM_ID_EXCEPTION) {
            ids.push(customId);
        }

        return '';
    });

    return ids.length ? ids : null;
};

export const removeCustomId = (content: string) => {
    if (CUSTOM_ID_REGEXP.test(content)) {
        return content
            .replace(CUSTOM_ID_REGEXP, (match) => {
                if (match === CUSTOM_ID_EXCEPTION) {
                    return match;
                }

                return '';
            })
            .trim();
    }

    return content;
};

export const removeCustomIds = (token: Token) => {
    token.content = removeCustomId(token.content);
    token.children?.forEach((child) => {
        child.content = removeCustomId(child.content);
    });
};
