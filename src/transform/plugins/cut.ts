import type Core from 'markdown-it/lib/parser_core';
import type Token from 'markdown-it/lib/token';
import {MarkdownItPluginCb} from './typings';
import {MatchTokenFunction, nestedCloseTokenIdxFactory as closeTokenFactory} from './utils';
import {AttrsParser} from './attrs';

const CUT_REGEXP = /^{%\s*cut\s*["|'](.*)["|']\s*%}(.*)?$/;

const matchCloseToken: MatchTokenFunction = (tokens, i) => {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endcut %}'
    );
};

const matchOpenToken = (tokens: Token[], i: number) => {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(CUT_REGEXP)
    );
};

const findCloseTokenIdx = closeTokenFactory('Cut', matchOpenToken, matchCloseToken);

const cut: MarkdownItPluginCb = (md, {path, log}) => {
    const plugin: Core.RuleCore = (state) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const match = matchOpenToken(tokens, i);

            if (match) {
                const closeTokenIdx = findCloseTokenIdx(tokens, i + 4, path, log);

                if (!closeTokenIdx) {
                    i += 3;
                    continue;
                }

                const title = match[1];
                const attrs = match[2] || '';

                if (typeof title === 'undefined') {
                    throw new Error(`No title provided for cut ${match[0]}`);
                }

                const attrsParser = new AttrsParser(attrs);

                const newOpenToken = new state.Token('yfm_cut_open', 'details', 1);
                newOpenToken.attrSet('class', 'yfm-cut');
                newOpenToken.map = tokens[i].map;

                attrsParser.apply(newOpenToken);

                const titleOpen = new state.Token('yfm_cut_title_open', 'summary', 1);
                titleOpen.attrSet('class', 'yfm-cut-title');

                const titleInline = state.md.parseInline(title, state.env)[0];

                const titleClose = new state.Token('yfm_cut_title_close', 'summary', -1);

                const contentOpen = new state.Token('yfm_cut_content_open', 'div', 1);
                contentOpen.attrSet('class', 'yfm-cut-content');

                if (newOpenToken.map) {
                    const contentOpenStart = newOpenToken.map[0] + 1;
                    const contentOpenEnd = newOpenToken.map[0] + 2;

                    contentOpen.map = [contentOpenStart, contentOpenEnd];
                }

                const contentClose = new state.Token('yfm_cut_content_close', 'div', -1);

                const newCloseToken = new state.Token('yfm_cut_close', 'details', -1);
                newCloseToken.map = tokens[closeTokenIdx].map;

                const insideTokens = [
                    newOpenToken,
                    titleOpen,
                    titleInline,
                    titleClose,
                    contentOpen,
                    ...tokens.slice(i + 3, closeTokenIdx),
                    contentClose,
                    newCloseToken,
                ];

                tokens.splice(i, closeTokenIdx - i + 3, ...insideTokens);

                i++;
            } else {
                i++;
            }
        }
    };

    try {
        md.core.ruler.before('curly_attributes', 'cut', plugin);
    } catch (e) {
        md.core.ruler.push('cut', plugin);
    }
};

export = cut;
