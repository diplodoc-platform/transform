import {MarkdownItPluginCb} from '../typings';

const inlineCode: MarkdownItPluginCb = (md) => {
    md.renderer.rules.code_inline = function (tokens, idx) {
        return `<code class="yfm-clipboard-inline-code" id="snipet-${idx}">${tokens[idx].content}</code>`;
    };
};

export = inlineCode;
