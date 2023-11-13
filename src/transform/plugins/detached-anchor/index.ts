import MarkdownIt from 'markdown-it';
import {createTokens, renderTokens, TOKEN_NAME} from './detached-anchor';

const freeAnchor = (md: MarkdownIt) => {
    md.block.ruler.before('paragraph', TOKEN_NAME, createTokens);
    md.renderer.rules[TOKEN_NAME] = renderTokens;

    return md;
};

export default freeAnchor;
