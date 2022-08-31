import Token from 'markdown-it/lib/token';

export = function extractTitle(tokens: Token[]) {
    let title = '',
        contentTokens = tokens,
        titleTokens: Token[] = [];

    if (Array.isArray(tokens) && tokens.length > 0) {
        let start = 0;
        const skipTokenType = ['__yfm_lint'];

        while (skipTokenType.includes(tokens[start].type)) {
            start++;
        }

        if (tokens[start].type === 'heading_open' && tokens[start].tag === 'h1') {
            titleTokens = tokens[start + 1].children || [];
            title = tokens[start + 1].content;
            // cut out "heading_open", "inline" and "heading_close" tokens
            contentTokens = [...tokens.slice(0, start), ...tokens.slice(start + 3)];
        }
    }

    return {
        titleTokens,
        title,
        tokens: contentTokens,
    };
};
