import type StateBlock from 'markdown-it/lib/rules_block/state_block';
import type {MarkdownIt} from '../../typings';
import type {MarkdownItPluginOpts} from '../typings';

import {BASIC_TERM_REGEXP} from './constants';

const INCLUDE_LINE_RE = /^{%\s*include\s/;
const NEW_LINE_RE = /^(\r\n|\r|\n)/;
const TERM_DEF_RE = /^\[\*([^[\]]+)\]:/;

/**
 * @param state - markdown-it block state
 * @param line - line number to read
 * @returns raw source text of the given line
 */
function getNextLineContent(state: StateBlock, line: number): string {
    const start = state.bMarks[line];
    const end = state.eMarks[line];

    return start === end ? state.src[start] : state.src.slice(start, end);
}

/**
 * Checks whether the first non-blank line after {@link fromLine} is an
 * `{% include %}` directive.  Used to allow blank-line gaps between
 * consecutive includes inside a single term definition.
 *
 * @param state - markdown-it block state
 * @param fromLine - line number from which to start searching
 * @param endLine - last line number to search within
 * @returns true if the first non-blank line is an include directive
 */
function hasIncludeAfterBlanks(state: StateBlock, fromLine: number, endLine: number): boolean {
    for (let line = fromLine + 1; line <= endLine; line++) {
        const start = state.bMarks[line];
        const end = state.eMarks[line];

        if (start === end) {
            continue;
        }

        const content = state.src.slice(start, end);
        return INCLUDE_LINE_RE.test(content.trimStart());
    }
    return false;
}

/**
 * Scans forward from {@link startLine} to find where the current term
 * definition ends.
 *
 * When `multilineTermDefinitions` is enabled, the definition continues
 * past blank lines and stops only at the next `[*key]:` or end of block.
 * Otherwise blank lines terminate the definition unless followed by an
 * `{% include %}` directive (legacy behaviour).
 *
 * @param state - markdown-it block state
 * @param startLine - line where the current definition starts
 * @param endLine - last line of the block
 * @param multiline - whether multiline mode is enabled
 * @returns line number where the definition ends
 */
function findDefinitionEnd(
    state: StateBlock,
    startLine: number,
    endLine: number,
    multiline: boolean,
): number {
    let currentLine = startLine;

    for (; currentLine < endLine; currentLine++) {
        const nextLine = getNextLineContent(state, currentLine + 1);

        if (TERM_DEF_RE.test(nextLine)) {
            break;
        }

        if (!multiline && NEW_LINE_RE.test(nextLine)) {
            if (!hasIncludeAfterBlanks(state, currentLine + 1, endLine)) {
                break;
            }
        }

        state.line = currentLine + 1;
    }

    return currentLine;
}

export function termDefinitions(md: MarkdownIt, options: MarkdownItPluginOpts) {
    const multiline = options.multilineTermDefinitions === true;

    return (state: StateBlock, startLine: number, endLine: number, silent: boolean) => {
        let ch;
        let labelEnd;
        let pos = state.bMarks[startLine] + state.tShift[startLine];
        let max = state.eMarks[startLine];

        if (pos + 2 >= max) {
            return false;
        }

        if (state.src.charCodeAt(pos++) !== 0x5b /* [ */) {
            return false;
        }
        if (state.src.charCodeAt(pos++) !== 0x2a /* * */) {
            return false;
        }

        const labelStart = pos;

        for (; pos < max; pos++) {
            ch = state.src.charCodeAt(pos);
            if (ch === 0x5b /* [ */) {
                return false;
            } else if (ch === 0x5d /* ] */) {
                labelEnd = pos;
                break;
            } else if (ch === 0x5c /* \ */) {
                pos++;
            }
        }

        const currentLine = findDefinitionEnd(state, startLine, endLine, multiline);

        max = state.eMarks[currentLine];

        if (!labelEnd || labelEnd < 0 || state.src.charCodeAt(labelEnd + 1) !== 0x3a /* : */) {
            return false;
        }

        if (silent) {
            return true;
        }

        const label = state.src.slice(labelStart, labelEnd).replace(/\\(.)/g, '$1');
        const title = state.src.slice(labelEnd + 2, max).trim();

        if (label.length === 0 || title.length === 0) {
            return false;
        }

        return processTermDefinition(
            md,
            options,
            state,
            currentLine,
            startLine,
            endLine,
            label,
            title,
        );
    };
}

function processTermDefinition(
    md: MarkdownIt,
    options: MarkdownItPluginOpts,
    state: StateBlock,
    currentLine: number,
    startLine: number,
    endLine: number,
    label: string,
    title: string,
) {
    let token;

    if (!state.env.terms) {
        state.env.terms = {};
    }

    const basicTermDefinitionRegexp = new RegExp(BASIC_TERM_REGEXP, 'gm');
    // If term inside definition

    const {isLintRun} = options;

    if (basicTermDefinitionRegexp.test(title) && isLintRun) {
        token = new state.Token('__yfm_lint', '', 0);
        token.hidden = true;
        token.map = [currentLine, endLine];
        token.attrSet('YFM008', 'true');
        state.tokens.push(token);
    }

    // If term definition duplicated
    if (state.env.terms[':' + label] && isLintRun) {
        token = new state.Token('__yfm_lint', '', 0);
        token.hidden = true;
        token.map = [currentLine, endLine];
        token.attrSet('YFM006', 'true');
        state.tokens.push(token);
        state.line = currentLine + 1;
        return true;
    }

    if (typeof state.env.terms[':' + label] === 'undefined') {
        state.env.terms[':' + label] = title;
    }

    const fromInclude = Array.isArray(state.env.includes) && state.env.includes.length > 0;

    token = new state.Token('dfn_open', 'dfn', 1);
    token.attrSet('class', 'yfm yfm-term_dfn');
    token.attrSet('id', ':' + label + '_element');
    token.attrSet('role', 'dialog');
    token.attrSet('aria-live', 'polite');
    token.attrSet('aria-modal', 'true');

    if (fromInclude) {
        token.attrSet('from-include', 'true');
    }

    state.tokens.push(token);

    const titleTokens = md.parse(title, state.env);

    for (const titleToken of titleTokens) {
        if (titleToken.children?.length) {
            titleToken.content = '';
        }

        if (!titleToken.map) {
            state.tokens.push(titleToken);
            continue;
        }

        const [start, end] = titleToken.map;

        titleToken.map = [start + startLine, end + startLine];
        state.tokens.push(titleToken);
    }

    token = new state.Token('dfn_close', 'dfn', -1);

    state.tokens.push(token);

    /** current line links to end of term definition */
    state.line = currentLine + 1;

    return true;
}
