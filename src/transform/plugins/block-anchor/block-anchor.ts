import StateCore from 'markdown-it/lib/rules_core/state_core';
import Token from 'markdown-it/lib/token';

const pattern = /^{%[^\S\r\n]*anchor[^\S\r\n]+([\w-]+)[^\S\r\n]*%}/;
export const TOKEN_NAME = 'anchor';

function matchOpenToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 2].type === 'paragraph_close' &&
        tokens[i + 1].children?.length === 1 &&
        tokens[i + 1].children?.[0].type === 'text' &&
        pattern.exec(tokens[i + 1].children?.[0].content as string)
    );
}

function createAnchorToken(state: StateCore, anchorId: string, position: number) {
    const token = new state.Token(TOKEN_NAME, '', 0);
    token.map = state.tokens[position].map;
    token.markup = state.tokens[position].markup;
    token.content = anchorId;
    return token;
}

export function replaceTokens(state: StateCore) {
    const blockTokens = state.tokens;
    // i hate the idea of splicing the array while we're iterating over it
    // so first lets find all the places where we will need to splice it and then actually do the splicing
    const splicePointsMap: Map<number, string> = new Map();
    for (let i = 0; i < blockTokens.length; i++) {
        const match = matchOpenToken(blockTokens, i);

        if (!match) {
            continue;
        }

        splicePointsMap.set(i, match[1]);
    }
    splicePointsMap.forEach((anchorId, position) => {
        blockTokens.splice(position, 3, createAnchorToken(state, anchorId, position));
    });
}

export function renderTokens(tokens: Token[], idx: number) {
    const token = tokens[idx];
    const id = token.content;
    return `<hr id=${id} class="visually-hidden"/>`;
}
