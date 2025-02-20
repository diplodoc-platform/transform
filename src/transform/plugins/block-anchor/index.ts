import MarkdownIt from 'markdown-it';

import {TOKEN_NAME, renderTokens, replaceTokens} from './block-anchor';

const blockAnchor = (md: MarkdownIt) => {
    try {
        md.core.ruler.before('curly_attributes', TOKEN_NAME, replaceTokens);
    } catch (e) {
        md.core.ruler.push(TOKEN_NAME, replaceTokens);
    }
    md.renderer.rules[TOKEN_NAME] = renderTokens;

    return md;
};

export = blockAnchor;
