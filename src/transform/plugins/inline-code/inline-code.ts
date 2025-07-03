import {MarkdownItPluginCb, StateCore} from '../../typings';
import {generateID} from '../utils';

import {LANG_TOKEN, LANG_TOKEN_DESCRIPTION, LANG_TOKEN_LABEL} from './constant';

const inlineCode: MarkdownItPluginCb = (md, options) => {
    const lang = options.lang;

    md.renderer.rules.code_inline = function (tokens, idx) {
        const id = generateID();

        const description = LANG_TOKEN_DESCRIPTION[lang] ?? LANG_TOKEN_DESCRIPTION.en;
        const label = LANG_TOKEN_LABEL[lang] ?? LANG_TOKEN_LABEL.en;

        return `<code class="yfm-clipboard-inline-code" role="button" aria-label="${label}" aria-description="${description}" tabindex='0' id="${id}">${tokens[idx].content}</code>`;
    };

    md.core.ruler.after('inline', 'tooltip_code_inline', (state: StateCore) => {
        const tokens = state.tokens;

        for (let i = 0; i !== tokens.length; i++) {
            const token = tokens[i];

            if (token.type !== 'inline') {
                continue;
            }

            if (!token.children || token.children.every((e) => e.type !== 'code_inline')) {
                continue;
            }

            const child = token.children.find((e) => e.type === 'code_inline');

            if (!child) {
                return;
            }

            const dialog = new state.Token('dfn_open', 'dfn', 1);
            dialog.attrSet('class', 'yfm yfm-term_dfn');
            dialog.attrSet('id', `tooltip_inline_clipboard_dialog`);
            dialog.attrSet('role', 'dialog');
            dialog.attrSet('aria-live', 'polite');
            dialog.attrSet('aria-modal', 'true');

            tokens.push(dialog);

            const text = new state.Token('text', '', 0);
            text.content = LANG_TOKEN[lang] ?? 'Copied';
            tokens.push(text);

            const closeDialog = new state.Token('dfn_close', 'dfn', -1);
            tokens.push(closeDialog);
            break;
        }
    });
};

export = inlineCode;
