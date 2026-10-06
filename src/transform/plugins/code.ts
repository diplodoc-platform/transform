/* eslint-disable max-len */

import type {MarkdownItPluginCb} from './typings';
import type {IDGenerator} from './utils';

import {escapeHtml} from 'markdown-it/lib/common/utils';

import {generateID as globalGenerateID} from './utils';

const wrapInFloatingContainer = (
    element: string | undefined,
    id: number,
    lineWrapping: boolean,
    hasWrap: boolean,
) => {
    const buttonClassNames = [
        'g-button',
        'g-button_view_flat',
        'g-button_size_m',
        'g-button_pin_round-round',
        'g-md-viewer-code-button',
        'yfm-code-button',
        'yfm-wrapping-button',
    ];
    if (hasWrap) {
        buttonClassNames.push('g-button_selected');
    }
    const wrappingButton = lineWrapping
        ? `<button role="button" class="${buttonClassNames.join(' ')}" tabindex="-1" type="button" aria-label="Toggle line wrapping" aria-pressed="${hasWrap}" data-tabindex="0">
            <span class="g-button__icon">
            <span class="g-button__icon-inner"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" class="g-icon" fill="currentColor" stroke="none" aria-hidden="true">
                <svg class="yfm-code-icon yfm-wrapping-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
                    <path fill="currentColor" fill-rule="evenodd" d="M2.47 11.28a.75.75 0 0 1 0-1.06l3-3a.75.75 0 0 1 1.06 1.06L4.81 10H9a3.25 3.25 0 0 0 0-6.5H8A.75.75 0 0 1 8 2h1a4.75 4.75 0 1 1 0 9.5H4.81l1.72 1.72a.75.75 0 1 1-1.06 1.06z" clip-rule="evenodd">
                    </path>
                </svg>
            </span>
            </span>
        </button>`
        : '';

    return `
    <div class="yfm-code-floating-container">
        ${element}
        <div class="yfm-code-floating">
            ${wrappingButton}
            <button role="button" class="g-button g-button_view_flat g-button_size_m g-button_pin_round-round g-md-viewer-code-button  yfm-code-button yfm-clipboard-button" aria-label="Copy">
                <span class="g-button__icon g-clipboard-button__icon">
                <span class="g-button__icon-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" class="yfm-code-icon yfm-clipboard-icon" data-animation="${id}">
                    <path
                        fill="currentColor"
                        d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"
                    />
                    <path
                        stroke="currentColor"
                        fill="transparent"
                        stroke-width="1.5"
                        d="M9.5 13l3 3l5 -5"
                        visibility="hidden"
                    >
                        <animate
                            id="visibileAnimation-${id}"
                            attributeName="visibility"
                            from="hidden"
                            to="visible"
                            dur="0.2s"
                            fill="freeze"
                            begin=""
                        />
                        <animate
                            id="hideAnimation-${id}"
                            attributeName="visibility"
                            from="visible"
                            to="hidden"
                            dur="1s"
                            begin="visibileAnimation-${id}.end+1"
                            fill="freeze"
                        />
                    </path>
                </svg>
                </span>
                </span>
            </button>
        </div>
    </div>
`;
};

interface EnvTerm {
    terms: {
        [keys: string]: string;
    };
}

function buildTermRegExp(env: EnvTerm, escape: (str: string) => string): RegExp | null {
    const termKeys = Object.keys(env.terms);
    if (!termKeys.length) {
        return null;
    }

    const regTerms = termKeys
        .map((el) => el.slice(1))
        .map(escape)
        .join('|');

    // The title must stay on a single line: a multi-line match would be collapsed
    // into a one-word placeholder and shift line numbers and prompt flags.
    return new RegExp('\\[([^\\[\\n]+)\\](\\(\\*(' + regTerms + ')\\))', 'g');
}

function renderTerm(title: string, termKey: string, generateID: IDGenerator): string {
    return `<i class="yfm yfm-term_title" term-key=":${termKey}" id="${generateID(termKey)}">${title}</i>`;
}

const TERM_PLACEHOLDER_PREFIX = 'yfmterm';
const TERM_PLACEHOLDER_END = 'z';
const TERM_PLACEHOLDER_DIGITS = 'abcdefghij';

interface TermPlaceholders {
    prefix: string;
    placeholders: Map<string, string>;
}

/**
 * Encodes a non-negative integer with letters `a`-`j` (one per decimal digit)
 * so the resulting token contains neither digits nor the terminator letter.
 *
 * @param value - Non-negative integer.
 * @returns Letter-only representation of `value`.
 */
function encodeIndex(value: number): string {
    return String(value)
        .split('')
        .map((digit) => TERM_PLACEHOLDER_DIGITS[Number(digit)])
        .join('');
}

/**
 * Replaces `[title](*key)` term references in the raw fence content with
 * letter-only placeholders BEFORE the content reaches the highlighter.
 *
 * Term markup is replaced on the raw source rather than on the highlighted
 * HTML because highlight.js splits the pattern with `<span>` tags for many
 * grammars (e.g. `[` `]` and `(*key)` get different token classes in yaml,
 * keywords like `type` get wrapped in typescript). A placeholder made of
 * lowercase letters only is always tokenized as a single word, so it survives
 * highlighting intact and can be swapped back for the term markup afterwards.
 *
 * @param content - Raw fence content.
 * @param reg - Term reference pattern built from the defined term keys.
 * @param generateID - ID generator for the term title element.
 * @returns Content with placeholders and the data needed to restore them.
 */
function replaceTermsWithPlaceholders(
    content: string,
    reg: RegExp,
    generateID: IDGenerator,
): {content: string} & TermPlaceholders {
    // Make sure the prefix never collides with something already in the code.
    let prefix = TERM_PLACEHOLDER_PREFIX;
    while (content.includes(prefix)) {
        prefix += 'x';
    }

    const placeholders = new Map<string, string>();
    reg.lastIndex = 0;
    const replaced = content.replace(
        reg,
        (_match: string, title: string, _p2: string, key: string) => {
            const placeholder = prefix + encodeIndex(placeholders.size) + TERM_PLACEHOLDER_END;
            placeholders.set(placeholder, renderTerm(escapeHtml(title), key, generateID));
            return placeholder;
        },
    );

    return {content: replaced, prefix, placeholders};
}

/**
 * Swaps term placeholders in the rendered HTML back for the term markup.
 *
 * @param html - Highlighted fence HTML containing placeholders.
 * @param placeholders - Placeholder data from {@link replaceTermsWithPlaceholders}.
 * @returns HTML with term markup restored.
 */
function restoreTermPlaceholders(html: string, {prefix, placeholders}: TermPlaceholders): string {
    if (!placeholders.size) {
        return html;
    }

    const placeholderRE = new RegExp(
        `${prefix}[${TERM_PLACEHOLDER_DIGITS}]+${TERM_PLACEHOLDER_END}`,
        'g',
    );

    return html.replace(
        placeholderRE,
        (placeholder) => placeholders.get(placeholder) ?? placeholder,
    );
}

/**
 * Fallback for fence renderers that do not render `token.content` verbatim:
 * replaces term references that are still intact in the rendered HTML.
 */
function termReplace(str: string, reg: RegExp, generateID: IDGenerator): string {
    reg.lastIndex = 0;

    return str.replace(reg, (_match: string, title: string, _p2: string, key: string) =>
        renderTerm(title, key, generateID),
    );
}

const SPAN_TAG_RE = /<span[^>]*>|<\/span>/g;

/**
 * Balances hljs span tags within each line so that every line is a
 * self-contained HTML fragment with no unclosed or unopened spans.
 *
 * highlight.js can produce spans that cross multiple lines (e.g. multiline strings).
 * Before:
 *   `['<span class="hljs-string">\'line1', 'line2\'</span>']`
 * After:
 *   `['<span class="hljs-string">\'line1</span>', '<span class="hljs-string">line2\'</span>']`
 * @param lines - Highlighted HTML split into separate lines.
 * @returns Lines with balanced `<span>` tags on each line.
 */
function balanceSpansPerLine(lines: string[]): string[] {
    const openTagStack: string[] = [];

    return lines.map((line) => {
        const prefix = openTagStack.join('');

        SPAN_TAG_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = SPAN_TAG_RE.exec(line)) !== null) {
            if (match[0] === '</span>') {
                openTagStack.pop();
            } else {
                openTagStack.push(match[0]);
            }
        }

        const suffix = '</span>'.repeat(openTagStack.length);
        return prefix + line + suffix;
    });
}

/**
 * Strips the prompt prefix from the raw fence content BEFORE it reaches the highlighter.
 *
 * @param content - Raw fence content.
 * @param prompt - Raw prompt string (e.g. `$`, `#`, `>>>`).
 * @returns Stripped content (same number of lines) and a per-line prompt flag array.
 */
function stripPrompt(content: string, prompt: string): {content: string; flags: boolean[]} {
    const hasTrailingNewline = content.endsWith('\n');
    const lines = content.split('\n');
    const linesToProcess = hasTrailingNewline ? lines.slice(0, -1) : lines;

    const flags: boolean[] = [];
    const stripped = linesToProcess.map((line) => {
        const trimmed = line.trimStart();
        const leadingWs = line.slice(0, line.length - trimmed.length);

        if (trimmed.startsWith(prompt + ' ')) {
            flags.push(true);
            return leadingWs + trimmed.slice(prompt.length + 1);
        }

        if (trimmed === prompt) {
            flags.push(true);
            return leadingWs;
        }

        flags.push(false);
        return line;
    });

    return {
        content: stripped.join('\n') + (hasTrailingNewline ? '\n' : ''),
        flags,
    };
}

function postProcessCode(
    code: string,
    {
        showLineNumbers,
        lineWrapping,
        promptFlags,
        promptEscaped,
    }: {
        showLineNumbers: boolean;
        lineWrapping: boolean;
        promptFlags?: boolean[];
        promptEscaped?: string;
    },
): string {
    const hasTrailingNewline = code.endsWith('\n');
    const lines = code.split('\n');
    const linesToProcess = hasTrailingNewline ? lines.slice(0, -1) : lines;
    const normalized = balanceSpansPerLine(linesToProcess);
    const maxDigits = String(normalized.length).length;

    return (
        normalized
            .map((line, index) => {
                // The prompt was already stripped from the raw content before
                // highlighting, so `line` here is the highlighted command only.
                // Re-insert the prompt as a dedicated, non-selectable span after
                // any leading whitespace. `promptFlags` marks which lines carried
                // a prompt in the original source.
                if (promptFlags?.[index] && promptEscaped !== undefined) {
                    const trimmed = line.trimStart();
                    const leadingWs = line.slice(0, line.length - trimmed.length);
                    line =
                        `${leadingWs}` +
                        `<span class="yfm-code-prompt" aria-hidden="true">${promptEscaped} </span>` +
                        `${trimmed}`;
                }

                if (showLineNumbers) {
                    const lineNumber = String(index + 1).padStart(maxDigits, ' ');
                    line = lineWrapping
                        ? `<span class="yfm-line-number">${lineNumber}</span><span class="yfm-line">${line}</span>`
                        : `<span class="yfm-line-number">${lineNumber}</span>${line}`;
                }

                return line;
            })
            .join('\n') + (hasTrailingNewline ? '\n' : '')
    );
}

/**
 * @param info - Raw fence info string (e.g. `js showLineNumbers prompt="$"`).
 * @returns Parsed flags and the optional prompt value.
 */
function parseFenceInfo(info: string): {
    showLineNumbers: boolean;
    wrapLines: boolean;
    prompt?: string;
} {
    const promptMatch = /(?:^|\s)prompt=(?:"([^"]*)"|'([^']*)')/.exec(info);
    const prompt = promptMatch?.[1] ?? promptMatch?.[2];
    const rest = promptMatch ? info.replace(promptMatch[0], ' ') : info;

    return {
        showLineNumbers: /\bshowLineNumbers\b/.test(rest),
        wrapLines: /\bwrap\b/.test(rest),
        prompt,
    };
}

type CodeOptions = {
    /**
     * Show button to toggle line wrapping of code.
     * @type {boolean}
     * @default false
     */
    codeLineWrapping?: boolean;
};

const code: MarkdownItPluginCb<CodeOptions> = (md, opts) => {
    const lineWrapping = opts?.codeLineWrapping || false;
    const generateID = opts?.generateID ?? globalGenerateID;

    const superCodeRenderer = md.renderer.rules.fence;
    md.renderer.rules.fence = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const {showLineNumbers, prompt, wrapLines} = parseFenceInfo(token.info);
        const shouldWrap = wrapLines;

        // Strip the prompt prefix from the raw content BEFORE handing it
        // to the highlighter, so language grammars never misinterpret prompt
        // symbols (e.g. `#` as a shell comment, `$` as a variable). The prompt is
        // re-inserted as a span in postProcessCode, driven by `promptFlags`.
        let promptFlags: boolean[] | undefined;
        let promptEscaped: string | undefined;
        const originalContent = token.content;
        if (prompt) {
            const stripped = stripPrompt(token.content, prompt);
            token.content = stripped.content;
            promptFlags = stripped.flags;
            promptEscaped = escapeHtml(prompt);
        }

        // Swap term references for placeholders BEFORE highlighting so that
        // language grammars cannot split `[title](*key)` into several spans.
        // The placeholders are restored after the HTML is rendered.
        const termRE = env?.terms ? buildTermRegExp(env, md.utils.escapeRE) : null;
        const termPlaceholders = termRE
            ? replaceTermsWithPlaceholders(token.content, termRE, generateID)
            : null;
        if (termPlaceholders) {
            token.content = termPlaceholders.content;
        }

        let superCode = superCodeRenderer?.(tokens, idx, options, env, self);

        // Restore the original content so the mutation does not leak to other
        // consumers of the token.
        token.content = originalContent;

        if (superCode && (showLineNumbers || prompt)) {
            // Extract the code content from the pre/code tags
            const codeMatch = superCode.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
            if (codeMatch) {
                const codeContent = codeMatch[1];
                const processedCode = postProcessCode(codeContent, {
                    showLineNumbers,
                    lineWrapping,
                    promptFlags,
                    promptEscaped,
                });
                // Escape $ in replacement string: $$ becomes a literal $ in String.replace()
                const escapedReplacement = processedCode.replace(/\$/g, '$$$$');
                superCode = superCode.replace(codeContent, escapedReplacement);
            }
        }

        // Attach the raw prompt value as a data attribute on <code> so that the
        // copy widget can strip it from the plain-text content without relying on
        // any class names or DOM structure introduced by the plugin.
        if (superCode && (prompt || shouldWrap)) {
            superCode = superCode.replace(/(<pre[^>]*><code)([^>]*)>/, (_match, open, attrs) => {
                // Add the wrap class
                if (shouldWrap) {
                    attrs = /class="[^"]*"/.test(attrs)
                        ? attrs.replace(/class="([^"]*)"/, 'class="$1 wrap"')
                        : ` class="wrap"${attrs}`;
                }

                // Add the data-prompt attribute
                if (prompt) {
                    attrs = ` data-prompt="${escapeHtml(prompt)}"${attrs}`;
                }

                return `${open}${attrs}>`;
            });
        }

        if (superCode && termRE && termPlaceholders) {
            superCode = restoreTermPlaceholders(superCode, termPlaceholders);
            superCode = termReplace(superCode, termRE, generateID);
        }

        return wrapInFloatingContainer(superCode, idx, lineWrapping, shouldWrap);
    };
};

export = code;
