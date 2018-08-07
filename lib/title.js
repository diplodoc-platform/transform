'use strict';

module.exports = function extractTitle(tokens) {
    let title = '', contentTokens = tokens;

    if (Array.isArray(tokens) && tokens.length > 0) {
        if (tokens[0].type === 'heading_open' && tokens[0].tag === 'h1') {
            title = tokens[1].content;
            // cut out "heading_open", "inline" and "heading_close" tokens
            contentTokens = tokens.slice(3);
        }
    }

    return {
        title,
        tokens: contentTokens
    };
};
