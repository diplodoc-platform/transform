import {Rule} from 'markdownlint';

export const yfm005: Rule = {
    names: ['YFM005', 'tab-list-not-closed'],
    description: 'Tab list not closed',
    tags: ['tab'],
    function: function YFM005(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        params.tokens
            .filter((token) => {
                return token.type === 'paragraph_open';
            })
            .forEach((table) => {
                // @ts-expect-error bad markdownlint typings
                if (table.attrGet('YFM005')) {
                    onError({
                        lineNumber: table.lineNumber,
                        context: table.line,
                    });
                }
            });
    },
};
