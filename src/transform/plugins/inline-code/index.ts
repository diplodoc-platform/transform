import type {MarkdownItPluginCb} from '../../typings';

import {escapeHtml} from 'markdown-it/lib/common/utils';

import {generateID as globalGenerateID} from '../utils';

import {LANG_TOKEN_DESCRIPTION, LANG_TOKEN_LABEL} from './constant';

const inlineCode: MarkdownItPluginCb = (md, options) => {
    const lang = options.lang;
    const generateID = options.generateID ?? globalGenerateID;

    md.renderer.rules.code_inline = function (tokens, idx) {
        const id = generateID('inline-code-id');

        const description = LANG_TOKEN_DESCRIPTION[lang] ?? LANG_TOKEN_DESCRIPTION.en;
        const label = LANG_TOKEN_LABEL[lang] ?? LANG_TOKEN_LABEL.en;

        return `<code class="yfm-clipboard-inline-code" role="button" aria-label="${label}" aria-description="${description}" tabindex='0' id="${id}">${escapeHtml(tokens[idx].content)}</code>`;
    };
};

export = inlineCode;
