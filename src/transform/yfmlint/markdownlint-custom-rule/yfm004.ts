import {Rule} from 'markdownlint';

export const yfm004: Rule = {
    names: ['YFM004', 'table-not-closed'],
    description: 'Table not closed',
    tags: ['table'],
    function: function YFM004(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        params.tokens
            .filter((token) => {
                return token.type === '__yfm_lint';
            })
            .forEach((table) => {
                // @ts-expect-error bad markdownlint typings
                if (table.attrGet('YFM004')) {
                    onError({
                        lineNumber: table.lineNumber,
                        context: table.line,
                    });
                }
            });
    },
};
