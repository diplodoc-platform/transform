module.exports = {
    'names': ['YFM003', 'unreachable-link'],
    'description': 'Link is unreachable',
    'tags': ['links'],
    'function': function YFM003(params, onError) {
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
                        if (link.attrGet('YFM003')) {
                            onError({
                                lineNumber: link.lineNumber,
                                context: link.line,
                            });
                        }
                    });
            });
    },
};
