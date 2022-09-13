import StateBlock from 'markdown-it/lib/rules_block/state_block';
import {MarkdownIt} from '../../typings';
import {MarkdownItPluginOpts} from '../typings';
import {BASIC_TERM_REGEXP} from './constants';

export function termDefinitions(md: MarkdownIt, options: MarkdownItPluginOpts) {
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

        const newLineReg = new RegExp(/^(\r\n|\r|\n)/);
        const termReg = new RegExp(/^\[\*(\w+)\]:/);

        let currentLine = startLine;

        // Allow multiline term definition
        for (; currentLine < endLine; currentLine++) {
            const nextLineStart = state.bMarks[currentLine + 1];
            const nextLineEnd = state.eMarks[currentLine + 1];

            const nextLine =
                nextLineStart === nextLineEnd
                    ? state.src[nextLineStart]
                    : state.src.slice(nextLineStart, nextLineEnd);

            if (newLineReg.test(nextLine) || termReg.test(nextLine)) {
                break;
            }

            state.line = currentLine + 1;
        }

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

        return processTermDefinition(md, options, state, currentLine, endLine, label, title);
    };
}

function processTermDefinition(
    md: MarkdownIt,
    options: MarkdownItPluginOpts,
    state: StateBlock,
    currentLine: number,
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

    const termNodes = [];

    token = new state.Token('template_open', 'template', 1);
    token.attrSet('id', ':' + label + '_template');
    termNodes.push(token);

    token = new state.Token('term_open', 'dfn', 1);
    token.attrSet('class', 'yfm yfm-term_dfn');
    token.attrSet('id', ':' + label + '_element');
    token.attrSet('role', 'tooltip');
    termNodes.push(token);

    termNodes.push(...md.parse(title, {}));

    token = new state.Token('term_close', 'dfn', -1);
    termNodes.push(token);

    token = new state.Token('template_close', 'template', -1);
    termNodes.push(token);

    if (!state.env.termTokens) {
        state.env.termTokens = [];
    }

    state.env.termTokens.push(...termNodes);

    state.line = currentLine + 1;
    return true;
}
