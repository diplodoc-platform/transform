module.exports = {
    'names': ['YFM004', 'unreachable-link-with-hash'],
    'description': 'Link is unreachable, hash does not exist',
    'tags': ['links'],
    'function': function YFM004(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        params.tokens
            .filter((token) => {
                return token.type === 'inline';
            })
            .forEach((inline) => {
                inline.children
                    .filter((child) => {
                        return child.type === 'link_open';
                    })
                    .forEach((link) => {
                        if (link.attrGet('YFM004')) {
                            onError({
                                lineNumber: link.lineNumber,
                                context: link.line,
                            });
                        }
                    });
            });
    },
};
