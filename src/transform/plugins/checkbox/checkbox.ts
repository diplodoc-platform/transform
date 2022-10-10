import MarkdownIt from 'markdown-it';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import Token from 'markdown-it/lib/token';

// eslint-disable-next-line no-useless-escape
const pattern = /^\[(X|\s|\_|\-)\]\s(.*)/i;

function matchOpenToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(pattern)
    );
}

export type CheckboxOptions = {
    idPrefix?: string;
    divClass?: string;
};

export const checkboxReplace = function (_md: MarkdownIt, opts: CheckboxOptions) {
    let lastId = 0;
    const defaults = {
        divClass: 'checkbox',
        idPrefix: 'checkbox',
    };
    const options = Object.assign(defaults, opts);

    const createTokens = function (checked: boolean, label: string) {
        let token;
        const nodes = [];

        /**
         * <div class="checkbox">
         */
        token = new Token('checkbox_open', 'div', 1);
        token.block = true;
        token.attrs = [['class', options.divClass]];
        nodes.push(token);

        /**
         * <input type="checkbox" id="checkbox{n}" checked="true">
         */
        const id = options.idPrefix + lastId;
        lastId += 1;
        token = new Token('checkbox_input', 'input', 0);
        token.block = true;
        token.attrs = [
            ['type', 'checkbox'],
            ['id', id],
            ['disabled', ''],
        ];
        if (checked === true) {
            token.attrs.push(['checked', 'true']);
        }
        nodes.push(token);

        /**
         * <label for="checkbox{n}">
         */
        token = new Token('checkbox_label_open', 'label', 1);
        token.attrs = [['for', id]];
        nodes.push(token);

        /**
         * content of label tag
         */
        token = new Token('text', '', 0);
        token.content = label;
        nodes.push(token);

        /**
         * closing tags
         */
        token = new Token('checkbox_label_close', 'label', -1);
        token.block = true;
        nodes.push(token);
        token = new Token('checkbox_close', 'div', -1);
        token.block = true;
        nodes.push(token);
        return nodes;
    };
    const splitTextToken = function (matches: RegExpMatchArray) {
        let checked = false;
        const value = matches[1];
        const label = matches[2];
        if (value === 'X' || value === 'x') {
            checked = true;
        }
        return createTokens(checked, label);
    };
    return function (state: StateCore) {
        const blockTokens = state.tokens;
        for (let i = 0; i < blockTokens.length; i++) {
            const match = matchOpenToken(blockTokens, i);
            if (!match) {
                continue;
            }

            blockTokens.splice(i, 3, ...splitTextToken(match));
        }
    };
};
