import type MarkdownIt from 'markdown-it';
import type Core from 'markdown-it/lib/parser_core';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type Token from 'markdown-it/lib/token';

// eslint-disable-next-line no-useless-escape
export const pattern = /^\[(X|\s|\_|\-)\]\s(.*)/i;
export const CheckboxTokenType = {
    Checkbox: 'checkbox',
    CheckboxOpen: 'checkbox_open',
    CheckboxClose: 'checkbox_close',
    CheckboxInput: 'checkbox_input',
    CheckboxLabel: 'checkbox_label',
    CheckboxLabelOpen: 'checkbox_label_open',
    CheckboxLabelClose: 'checkbox_label_close',
} as const;

type ParsedCheckbox = {
    tokens: Token[];
    startLine: number;
    endLine: number;
    checked: boolean;
};

function matchOpenToken(tokens: Token[], i: number) {
    if (tokens[i].type !== 'paragraph_open' || tokens[i + 1].type !== 'inline') {
        return false;
    }

    const firstInline = tokens[i + 1].children?.[0];
    return firstInline?.type === 'text' && pattern.test(firstInline.content);
}

export type CheckboxOptions = {
    idPrefix?: string;
    divClass?: string;
    /** @default true */
    disabled?: boolean;
};

export const checkboxReplace = function (_md: MarkdownIt, opts?: CheckboxOptions): Core.RuleCore {
    let lastId = 0;
    const defaults: Required<CheckboxOptions> = {
        divClass: 'checkbox',
        idPrefix: 'checkbox',
        disabled: true,
    };
    const options = Object.assign(defaults, opts);

    const createTokens = function (state: StateCore, checkbox: ParsedCheckbox): Token[] {
        let token: Token;
        const nodes: Token[] = [];

        /**
         * <div class="checkbox">
         */
        token = new state.Token(CheckboxTokenType.CheckboxOpen, 'div', 1);
        token.block = true;
        token.map = [checkbox.startLine, checkbox.endLine];
        token.attrs = [['class', options.divClass]];
        nodes.push(token);

        /**
         * <input type="checkbox" id="checkbox{n}" checked="true">
         */
        const id = options.idPrefix + lastId;
        lastId += 1;
        token = new state.Token(CheckboxTokenType.CheckboxInput, 'input', 0);
        token.block = true;
        token.map = [checkbox.startLine, checkbox.endLine];
        token.attrs = [
            ['type', 'checkbox'],
            ['id', id],
        ];
        if (options.disabled) {
            token.attrSet('disabled', '');
        }
        if (checkbox.checked === true) {
            token.attrSet('checked', 'true');
        }
        nodes.push(token);

        /**
         * <label for="checkbox{n}">
         */
        token = new state.Token(CheckboxTokenType.CheckboxLabelOpen, 'label', 1);
        token.attrs = [['for', id]];
        nodes.push(token);

        /**
         * content of label tag
         */
        nodes.push(...checkbox.tokens);

        /**
         * closing tags
         */
        token = new state.Token(CheckboxTokenType.CheckboxLabelClose, 'label', -1);
        token.block = true;
        token.map = [checkbox.startLine, checkbox.endLine];
        nodes.push(token);
        token = new state.Token(CheckboxTokenType.CheckboxClose, 'div', -1);
        token.block = true;
        token.map = [checkbox.startLine, checkbox.endLine];
        nodes.push(token);

        return nodes;
    };
    return function (state) {
        const blockTokens = state.tokens;
        for (let i = 0; i < blockTokens.length; i++) {
            if (!matchOpenToken(blockTokens, i)) {
                continue;
            }

            const pToken = blockTokens[i];
            const startLine = pToken.map?.[0] ?? NaN;

            const checkboxes = parseInlineContent(blockTokens[i + 1], startLine);

            const checkboxTokens: Token[] = [];
            for (const checkbox of checkboxes) {
                const first = checkbox.tokens[0];
                // remove checkbox markup [X]␣ at start of text content
                first.content = first.content.slice(4);
                checkboxTokens.push(...createTokens(state, checkbox));
            }

            // replace paragraph tokens with checkbox tokens
            if (checkboxTokens.length > 0) {
                blockTokens.splice(i, 3, ...checkboxTokens);
                i += checkboxTokens.length - 1;
            }
        }
    };
};

function parseInlineContent(inlineToken: Token, startLine: number): ParsedCheckbox[] {
    const children = inlineToken.children || [];

    const lines: Token[][] = [];
    {
        let lineIdx = 0;
        for (const child of children) {
            lines[lineIdx] ||= [];
            lines[lineIdx].push(child);

            if (isBreakToken(child)) {
                lineIdx += 1;
            }
        }
    }

    const checkboxes: ParsedCheckbox[] = [];
    {
        let checkboxIdx = -1;
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            const first = line?.[0];
            if (!first) {
                continue;
            }

            let match;
            if (first.type === 'text' && (match = first.content.match(pattern))) {
                const prevLastToken = checkboxes[checkboxIdx]?.tokens.at(-1);
                if (prevLastToken && isBreakToken(prevLastToken)) {
                    checkboxes[checkboxIdx].tokens.splice(-1);
                }

                checkboxIdx += 1;
                const value = match[1];
                const checked = value === 'X' || value === 'x';
                checkboxes[checkboxIdx] ||= {
                    tokens: [],
                    checked,
                    startLine: startLine + lineIdx,
                    endLine: startLine + lineIdx + 1,
                };
            }

            checkboxes[checkboxIdx].tokens.push(...line);
            checkboxes[checkboxIdx].endLine = startLine + lineIdx + 1;
        }
    }

    return checkboxes;
}

function isBreakToken(token: Token): boolean {
    return token.type === 'softbreak' || token.type === 'hardbreak';
}
