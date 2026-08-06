import type Token from 'markdown-it/lib/token';

const htmlComment = /^(?:\s*<!--[\s\S]*?-->\s*)+$/;

function isHtmlComment(token: Token) {
    return token.type === 'html_block' && htmlComment.test(token.content);
}

export = function extractTitle(tokens: Token[]) {
    let title = '',
        contentTokens = tokens,
        titleTokens: Token[] = [];

    if (Array.isArray(tokens) && tokens.length > 0) {
        const titleIndex = tokens.findIndex((token) => !isHtmlComment(token));
        const titleOpenToken = tokens[titleIndex];

        if (titleOpenToken?.type === 'heading_open' && titleOpenToken.tag === 'h1') {
            titleTokens = tokens[titleIndex + 1].children || [];
            title = tokens[titleIndex + 1].content;
            // cut out "heading_open", "inline" and "heading_close" tokens
            contentTokens = [...tokens.slice(0, titleIndex), ...tokens.slice(titleIndex + 3)];
        }
    }

    return {
        titleTokens,
        title,
        tokens: contentTokens,
    };
};
