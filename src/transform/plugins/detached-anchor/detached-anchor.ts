import StateBlock from 'markdown-it/lib/rules_block/state_block';
import Token from 'markdown-it/lib/token';

const pattern = /^{#([a-zA-Z0-9\-_]+)}$/;
export const TOKEN_NAME = 'detached-anchor';

export function createTokens(state: StateBlock, startLine: number): boolean {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const str = state.src.slice(pos, max);
    if (!str.startsWith('{')) {
        return false;
    }
    const match = str.match(pattern);
    if (!match) {
        return false;
    }
    const anchorId = match[1];
    state.line = startLine + 1;
    const token = state.push(TOKEN_NAME, '', 0);
    token.map = [startLine, state.line];
    token.content = anchorId;
    token.markup = match[0];
    return true;
}

export function renderTokens(tokens: Token[], idx: number) {
    const token = tokens[idx];
    const id = token.content;
    return `<a id=${id}></a>`;
}
