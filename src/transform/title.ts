import type Token from 'markdown-it/lib/token';

const htmlComment = /^(?:\s*<!--[\s\S]*?-->\s*)+$/;

function isHtmlComment(token: Token) {
    return (
        (token.type === 'html_block' || token.type === 'inline') && htmlComment.test(token.content)
    );
}

function getTitleIndex(tokens: Token[]) {
    let index = 0;

    while (index < tokens.length) {
        if (isHtmlComment(tokens[index])) {
            index += 1;
        } else if (
            tokens[index].type === 'paragraph_open' &&
            isHtmlComment(tokens[index + 1]) &&
            tokens[index + 2]?.type === 'paragraph_close'
        ) {
            index += 3;
        } else {
            break;
        }
    }

    return index;
}

export = function extractTitle(tokens: Token[]) {
    let title = '',
        contentTokens = tokens,
        titleTokens: Token[] = [];

    if (Array.isArray(tokens) && tokens.length > 0) {
        const titleIndex = getTitleIndex(tokens);
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
