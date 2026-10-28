/**
 * Resolve general Markdown attributes without changing the current Node default.
 * @param enabled - Explicit general-attributes setting.
 * @returns Whether the shared parser installs markdown-it-attrs.
 */
export function resolveMarkdownAttrs(enabled?: boolean): boolean {
    return enabled !== false;
}
