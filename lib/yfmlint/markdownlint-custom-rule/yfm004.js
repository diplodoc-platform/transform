module.exports = {
    'names': ['YFM004', 'table-not-closed'],
    'description': 'Table not closed',
    'tags': ['table'],
    'function': function YFM004(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        params.tokens.filter((token) => {
            return token.type === 'table_open';
        }).forEach((table) => {
            if (table.attrGet('YFM004')) {
                onError({
                    lineNumber: table.lineNumber,
                    context: table.line,
                });
            }
        });
    },
};
