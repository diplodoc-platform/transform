import {Rule} from 'markdownlint';

export const yfm008: Rule = {
    names: ['YFM008', 'term-inside-definition-not-allowed'],
    description: 'Term inside definition not allowed',
    tags: ['term'],
    function: function YFM008(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }
        params.tokens
            .filter((token) => {
                return token.type === '__yfm_lint';
            })
            .forEach((term) => {
                // @ts-expect-error bad markdownlint typings
                if (term.attrGet('YFM008')) {
                    onError({
                        lineNumber: term.lineNumber,
                        context: term.line,
                    });
                }
            });
    },
};
