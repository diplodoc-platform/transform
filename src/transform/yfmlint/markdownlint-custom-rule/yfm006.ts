import {Rule} from 'markdownlint';

export const yfm006: Rule = {
    names: ['YFM006', 'term-definition-duplicated'],
    description: 'Term definition duplicated',
    tags: ['term'],
    function: function YFM006(params, onError) {
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
                if (term.attrGet('YFM006')) {
                    onError({
                        lineNumber: term.lineNumber,
                        context: term.line,
                    });
                }
            });
    },
};
