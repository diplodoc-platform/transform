/**
 * Create the existing standalone include grammar without sharing RegExp state.
 * @returns A fresh expression with the historical capture groups and flags.
 */
export function createIncludeRegExp(): RegExp {
    return /^{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}$/;
}
