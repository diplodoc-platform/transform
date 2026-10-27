import type {MarkdownItPluginCb} from '../../typings';

import {generateID as globalGenerateID} from '../utils';

const inlineCode: MarkdownItPluginCb = (md, options) => {
    const {escapeHtml} = md.utils;
    const generateID = options.generateID ?? globalGenerateID;

    md.renderer.rules.code_inline = function (tokens, idx) {
        const id = generateID('inline-code-id');

        return `<code class="yfm-clipboard-inline-code" role="button" tabindex='0' id="${id}">${escapeHtml(tokens[idx].content)}</code>`;
    };
};

export = inlineCode;
