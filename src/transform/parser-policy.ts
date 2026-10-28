/**
 * Resolve the opt-in general Markdown attributes policy shared by every parser host.
 * @param enabled - Explicit general-attributes setting.
 * @returns Whether the shared parser installs markdown-it-attrs.
 */
export function resolveMarkdownAttrs(enabled?: boolean): boolean {
    return enabled === true;
}
