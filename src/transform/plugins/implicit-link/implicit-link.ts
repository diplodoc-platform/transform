import StateCore from 'markdown-it/lib/rules_core/state_core';

export function replaceTokens(state: StateCore) {
    const {tokens} = state;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type !== 'inline' || !tokens[i].children) continue;

        const splicePointsMap: Map<number, number> = new Map();

        tokens[i].children?.forEach((children, childrenIndex) => {
            if (children.type === 'text' && isUrl(children.content)) {
                splicePointsMap.set(i, childrenIndex);
            }
        });

        splicePointsMap.forEach((childrenIndex, tokenIndex) => {
            const token = tokens[tokenIndex];

            //TODO: refactor. children never nullable
            if (!token.children) return;

            const children = token.children[childrenIndex];

            tokens.splice(tokenIndex - 1, 3, token);
            token.children.splice(childrenIndex, 1, ...createLinkToken(state, children.content));
        });
    }
}

function isUrl(maybeUrl: string) {
    try {
        // eslint-disable-next-line no-new
        new URL(maybeUrl);
    } catch (err) {
        return false;
    }

    return true;
}

function createLinkToken(state: StateCore, link: string) {
    const linkOpenToken = new state.Token('link_open', 'a', 1);
    linkOpenToken.attrSet('href', link);

    const textToken = new state.Token('text', '', 0);
    textToken.content = link;

    const linkClose = new state.Token('link_close', 'a', -1);

    return [linkOpenToken, textToken, linkClose];
}
