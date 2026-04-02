/* eslint-disable max-len */

import type {MarkdownItPluginCb} from './typings';

import {generateID} from './utils';

const wrapInFloatingContainer = (
    element: string | undefined,
    id: number,
    {lineWrapping}: {lineWrapping: boolean},
) => {
    const wrappingButton = lineWrapping
        ? `<button role="button" class="yfm-code-button yfm-wrapping-button" aria-label="Toggle line wrapping">
                <svg width="16" height="16" viewBox="0 0 16 16" class="yfm-code-icon yfm-wrapping-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fill="currentColor"
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M2.47 11.28a.75.75 0 0 1 0-1.06l3-3a.75.75 0 0 1 1.06 1.06L4.81 10H9a3.25 3.25 0 0 0 0-6.5H8A.75.75 0 0 1 8 2h1a4.75 4.75 0 1 1 0 9.5H4.81l1.72 1.72a.75.75 0 1 1-1.06 1.06z"
                    />
                </svg>
            </button>`
        : '';

    return `
    <div class="yfm-code-floating-container">
        ${element}
        <div class="yfm-code-floating">
            ${wrappingButton}
            <button role="button" class="yfm-code-button yfm-clipboard-button" aria-label="Copy">
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

function termReplace(str: string, env: EnvTerm, escape: (str: string) => string): string {
    const regTerms = Object.keys(env.terms)
        .map((el) => el.slice(1))
        .map(escape)
        .join('|');
    const regText = '\\[([^\\[]+)\\](\\(\\*(' + regTerms + ')\\))';
    const reg = new RegExp(regText, 'g');

    const termCode = str.replace(
        reg,
        (_match: string, p1: string, _p2: string, p3: string) =>
            `<i class="yfm yfm-term_title" term-key=":${p3}" id="${generateID()}">${p1}</i>`,
    );

    return termCode || str;
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

function addLineNumbers(code: string, {lineWrapping}: {lineWrapping: boolean}): string {
    const hasTrailingNewline = code.endsWith('\n');
    const lines = code.split('\n');
    const linesToProcess = hasTrailingNewline ? lines.slice(0, -1) : lines;
    const normalized = balanceSpansPerLine(linesToProcess);
    const maxDigits = String(normalized.length).length;

    return (
        normalized
            .map((line, index) => {
                const lineNumber = String(index + 1).padStart(maxDigits, ' ');
                return lineWrapping
                    ? `<span class="yfm-line-number">${lineNumber}</span><span class="yfm-line">${line}</span>`
                    : `<span class="yfm-line-number">${lineNumber}</span>${line}`;
            })
            .join('\n') + (hasTrailingNewline ? '\n' : '')
    );
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

    const superCodeRenderer = md.renderer.rules.fence;
    md.renderer.rules.fence = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const showLineNumbers = token.info.includes('showLineNumbers');

        let superCode = superCodeRenderer?.(tokens, idx, options, env, self);

        if (superCode && showLineNumbers) {
            // Extract the code content from the pre/code tags
            const codeMatch = superCode.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
            if (codeMatch) {
                const codeContent = codeMatch[1];
                const codeWithLineNumbers = addLineNumbers(codeContent, {lineWrapping});
                // Escape $ in replacement string: $$ becomes a literal $ in String.replace()
                const escapedReplacement = codeWithLineNumbers.replace(/\$/g, '$$$$');
                superCode = superCode.replace(codeContent, escapedReplacement);
            }
        }

        const superCodeWithTerms =
            superCode && env?.terms ? termReplace(superCode, env, md.utils.escapeRE) : superCode;

        return wrapInFloatingContainer(superCodeWithTerms, idx, {lineWrapping});
    };
};

export = code;
