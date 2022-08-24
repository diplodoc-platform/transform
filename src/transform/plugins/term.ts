import StateBlock from 'markdown-it/lib/rules_block/state_block';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import Token from 'markdown-it/lib/token';

import {MarkdownItPluginCb} from './typings';
import {generateID} from './utils';

const term: MarkdownItPluginCb = (md) => {
    const escapeRE = md.utils.escapeRE,
        arrayReplaceAt = md.utils.arrayReplaceAt;

    function termDef(state: StateBlock, startLine: number, _endLine: number, silent: boolean) {
        let ch,
            labelEnd,
            pos = state.bMarks[startLine] + state.tShift[startLine];

        const max = state.eMarks[startLine];

        if (pos + 2 >= max) {
            return false;
        }

        if (state.src.charCodeAt(pos++) !== 0x2a /* * */) {
            return false;
        }
        if (state.src.charCodeAt(pos++) !== 0x5b /* [ */) {
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

        if (!labelEnd || labelEnd < 0 || state.src.charCodeAt(labelEnd + 1) !== 0x3a /* : */) {
            return false;
        }

        if (silent) {
            return true;
        }

        const label = state.src.slice(labelStart, labelEnd).replace(/\\(.)/g, '$1');
        const title = state.src.slice(labelEnd + 2, max).trim();

        if (label.length === 0) {
            return false;
        }
        if (title.length === 0) {
            return false;
        }
        if (!state.env.terms) {
            state.env.terms = {};
        }

        if (typeof state.env.terms[':' + label] === 'undefined') {
            state.env.terms[':' + label] = title;
        }

        const termNodes = [];
        let token;

        token = new state.Token('template_open', 'template', 1);
        token.attrSet('id', ':' + label + '_template');
        termNodes.push(token);

        token = new state.Token('term_open', 'dfn', 1);
        token.attrSet('class', 'yfm yfm-term_dfn');
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

        state.line = startLine + 1;
        return true;
    }

    function termReplace(state: StateCore) {
        let i, j, l, tokens, token, text, nodes, pos, term, currentToken;

        const blockTokens = state.tokens;

        if (!state.env.terms) {
            return;
        }

        const regTerms = Object.keys(state.env.terms)
            .map((el) => el.substr(1))
            .map(escapeRE)
            .join('|');
        const regText = '\\[([^\\[]+)\\](\\(\\*(' + regTerms + ')\\))';
        const reg = new RegExp(regText, 'g');

        for (j = 0, l = blockTokens.length; j < l; j++) {
            if (blockTokens[j].type === 'heading_open') {
                while (blockTokens[j].type !== 'heading_close') {
                    j++;
                }
                continue;
            }

            if (blockTokens[j].type !== 'inline') {
                continue;
            }

            tokens = blockTokens[j].children as Token[];

            for (i = tokens.length - 1; i >= 0; i--) {
                currentToken = tokens[i];
                if (currentToken.type === 'link_close') {
                    while (tokens[i].type !== 'link_open') {
                        i--;
                    }
                    continue;
                }

                if (!(currentToken.type === 'text')) {
                    continue;
                }

                pos = 0;
                text = currentToken.content;
                reg.lastIndex = 0;
                nodes = [];

                while ((term = reg.exec(text))) {
                    const termTitle = term[1];
                    const termKey = term[3];

                    if (term.index > 0 || term[1].length > 0) {
                        token = new state.Token('text', '', 0);
                        token.content = text.slice(pos, term.index);
                        nodes.push(token);
                    }

                    token = new state.Token('term_open', 'i', 1);
                    token.attrSet('class', 'yfm yfm-term_title');
                    token.attrSet('term-key', ':' + termKey);
                    token.attrSet('id', generateID());
                    nodes.push(token);

                    token = new state.Token('text', '', 0);
                    token.content = termTitle;
                    nodes.push(token);

                    token = new state.Token('term_close', 'i', -1);
                    nodes.push(token);

                    pos = reg.lastIndex;
                }

                if (!nodes.length) {
                    continue;
                }

                if (pos < text.length) {
                    token = new state.Token('text', '', 0);
                    token.content = text.slice(pos);
                    nodes.push(token);
                }

                // replace current node
                blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes);
            }
        }
    }

    md.block.ruler.before('reference', 'termDef', termDef, {alt: ['paragraph', 'reference']});

    md.core.ruler.after('linkify', 'termReplace', termReplace);
};

export = term;
