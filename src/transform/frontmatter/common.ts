export type FrontMatter = {
    [key: string]: unknown;
    metadata?: Record<string, unknown>[];
};

export const frontMatterFence = '---';

/**
 * Temporary workaround to enable parsing YAML metadata from potentially
 * Liquid-aware source files
 * @param content Input string which could contain Liquid-style substitution syntax (which clashes with YAML
 * object syntax)
 * @returns String with `{}` escaped, ready to be parsed with `js-yaml`
 */
export const escapeLiquidSubstitutionSyntax = (content: string): string =>
    content.replace(/{{/g, '(({{').replace(/}}/g, '}}))');

/**
 * Inverse of a workaround defined above.
 * @see `escapeLiquidSubstitutionSyntax`
 * @param escapedContent Input string with `{}` escaped with backslashes
 * @returns Unescaped string
 */
export const unescapeLiquidSubstitutionSyntax = (escapedContent: string): string =>
    escapedContent.replace(/\(\({{/g, '{{').replace(/}}\)\)/g, '}}');

export const countLineAmount = (str: string) => str.split(/\r?\n/).length;
