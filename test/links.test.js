const {dirname} = require('path');

const transform = require('../lib');
const links = require('../lib/plugins/links');
const includes = require('../lib/plugins/includes');
const {callPlugin, tokenize} = require('./utils');
const {title, customTitle} = require('./data/links');

const {log} = require('./utils');

const callLinksPlugin = callPlugin.bind(null, links);
const mocksPath = require.resolve('./utils.js');

const transformYfm = (text) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, links],
        path: mocksPath,
        root: dirname(mocksPath),
    });
    return html;
};

describe('Links', () => {
    test('Should create link with custom title', () => {
        const result = callLinksPlugin(tokenize([
            'Text before link',
            '',
            '[Custom title](./mocks/link.md) %}',
            '',
            'After link',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
            log,
        });

        expect(result).toEqual(customTitle);
    });

    test('Should create link with title from target', () => {
        const result = callLinksPlugin(tokenize([
            'Text before link',
            '',
            '[{#T}](./mocks/link.md)',
            '',
            'After link',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
        });

        expect(result).toEqual(title);
    });

    test('Should create link with title from target with include in the middle', () => {
        const input = '[{#T}](./mocks/include-link.md)';
        const result = transformYfm(input);

        expect(result).toEqual('<p><a href="./mocks/include-link.html">Title</a></p>\n');
    });
});
