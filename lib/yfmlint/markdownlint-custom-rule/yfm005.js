module.exports = {
    'names': ['YFM005', 'tab-list-not-closed'],
    'description': 'Tab list not closed',
    'tags': ['tab'],
    'function': function YFM005(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        params.tokens.filter((token) => {
            return token.type === 'paragraph_open';
        }).forEach((table) => {
            if (table.attrGet('YFM005')) {
                onError({
                    lineNumber: table.lineNumber,
                    context: table.line,
                });
            }
        });
    },
};
