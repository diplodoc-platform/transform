const Token = require('markdown-it/lib/token');

function callPlugin(plugin, tokens, opts) {
    const state = {
        tokens,
        env: {},
        Token
    };

    const fakeMd = {
        core: {
            ruler: {
                push: (name, cb) => cb(state)
            }
        }
    };

    plugin(fakeMd, opts);

    return state.tokens;
}

const paragraph = (content) => [
    {
        'type': 'paragraph_open',
        'content': ''
    }, {
        'type': 'inline',
        'children': [{
            'type': 'text',
            'tag': '',
            'children': null,
            content
        }],
        content
    }, {
        'type': 'paragraph_close',
        'content': ''
    }
];

module.exports = {callPlugin, paragraph};
