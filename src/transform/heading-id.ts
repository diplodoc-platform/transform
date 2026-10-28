// Shared legacy heading-ID grammar; this does not parse general Markdown attributes.

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

/**
 * Match a legacy heading alias without overriding an unrelated explicit ID.
 * @param content - Original heading inline content.
 * @param id - Requested fragment.
 * @param explicitId - ID already assigned by another rule, if any.
 * @returns Whether the existing standalone heading syntax identifies the fragment.
 */
export function matchesCustomHeadingId(content: string, id: string, explicitId = ''): boolean {
    const ids = getCustomIds(content);
    return Boolean(ids?.includes(id) && (!explicitId || ids.includes(explicitId)));
}
