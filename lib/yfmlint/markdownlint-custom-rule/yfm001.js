const {addErrorDetailIf, filterTokens, forEachInlineCodeSpan} = require('markdownlint-rule-helpers');

module.exports = {
    'names': ['YFM001', 'inline-code-length'],
    'description': 'Inline code length',
    'tags': ['line_length'],
    'function': function YFM001(params, onError) {
        const {config} = params;
        const maxLength = Number(config.maximum || 100);

        filterTokens(params, 'inline', (token) => {
            if (!token.children.some((child) => child.type === 'code_inline')) {
                return;
            }

            const tokenLines = params.lines.slice(token.map[0], token.map[1]);
            forEachInlineCodeSpan(tokenLines.join('\n'), (code, currentLine) => {
                if (code.length <= maxLength) {
                    return;
                }

                addErrorDetailIf(
                    onError,
                    token.lineNumber + currentLine,
                    maxLength,
                    code.length,
                    null,
                    code,
                );
            });
        });
    },
};
