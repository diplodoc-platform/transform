import StateCore from 'markdown-it/lib/rules_core/state_core';
import Token from 'markdown-it/lib/token';

import {MarkdownItPluginCb} from '../typings';
import {generateID} from '../utils';
import {termDefinitions} from './termDefinitions';
import {BASIC_TERM_REGEXP} from './constants';

const term: MarkdownItPluginCb = (md, options) => {
    const escapeRE = md.utils.escapeRE;
    const arrayReplaceAt = md.utils.arrayReplaceAt;

    const {isLintRun} = options;
    // Don't parse urls that starts with *
    const defaultLinkValidation = md.validateLink;
    md.validateLink = function (url) {
        if (url.startsWith('*')) {
            return false;
        }

        return defaultLinkValidation(url);
    };

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

                // Find terms without definitions
                const regexAllTerms = new RegExp(BASIC_TERM_REGEXP, 'gm');
                const uniqueTerms = [
                    ...new Set([...text.matchAll(regexAllTerms)].map((el) => `:${el[3]}`)),
                ];
                const notDefinedTerms = uniqueTerms.filter(
                    (el) => !Object.keys(state.env.terms).includes(el),
                );

                if (notDefinedTerms.length && isLintRun) {
                    token = new state.Token('__yfm_lint', '', 0);
                    token.hidden = true;
                    token.map = blockTokens[j].map;
                    token.attrSet('YFM007', 'true');
                    nodes.push(token);
                }

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
                    token.attrSet('aria-describedby', ':' + termKey + '_element');
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

    md.block.ruler.before('reference', 'termDefinitions', termDefinitions(md, options), {
        alt: ['paragraph', 'reference'],
    });

    md.core.ruler.after('linkify', 'termReplace', termReplace);
};

export = term;
