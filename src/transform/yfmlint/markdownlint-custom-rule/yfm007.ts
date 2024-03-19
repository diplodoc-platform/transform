import {Rule} from 'markdownlint';

export const yfm007: Rule = {
    names: ['YFM007', 'term-used-without-definition'],
    description: 'Term used without definition',
    tags: ['term'],
    function: function YFM007(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }
        params.tokens.forEach((el) =>
            el.children
                ?.filter((token) => {
                    return token.type === '__yfm_lint';
                })
                .forEach((term) => {
                    // @ts-expect-error bad markdownlint typings
                    if (term.attrGet('YFM007')) {
                        onError({
                            lineNumber: term.lineNumber,
                            context: term.line,
                        });
                    }
                }),
        );
    },
};
