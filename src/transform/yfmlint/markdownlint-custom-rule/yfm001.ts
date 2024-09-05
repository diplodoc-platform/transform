// @ts-expect-error
import {addErrorDetailIf, filterTokens, forEachInlineCodeSpan} from 'markdownlint-rule-helpers';
import {MarkdownItToken, Rule} from 'markdownlint';

export const yfm001: Rule = {
    names: ['YFM001', 'inline-code-length'],
    description: 'Inline code length',
    tags: ['line_length'],
    function: function YFM001(params, onError) {
        const {config} = params;
        const maxLength = Number(config.maximum || 100);

        filterTokens(params, 'inline', (token: MarkdownItToken) => {
            if (!token.children?.some((child) => child.type === 'code_inline') || !token.map) {
                return;
            }

            const tokenLines = params.lines.slice(token.map[0], token.map[1]);
            forEachInlineCodeSpan(tokenLines.join('\n'), (code: string, currentLine: number) => {
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
