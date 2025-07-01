import type {MarkdownItPluginCb} from '../typings';

const cssWhitelist = {
    '--hier-list-start': true,
};

export const olAttrConversion: MarkdownItPluginCb = (md) => {
    md.core.ruler.after('block', 'olAttrs', (state) => {
        state.tokens.forEach((token) => {
            const maybeStart = token.attrGet('start');

            if (token.type === 'ordered_list_open' && maybeStart) {
                token.attrSet('style', `--hier-list-start: ${Number(maybeStart) - 1};`);
            }
        });

        state.env.additionalOptionsCssWhiteList ||= {};

        Object.assign(state.env.additionalOptionsCssWhiteList, cssWhitelist);
    });
};
