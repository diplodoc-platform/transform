'use strict';
const {dirname} = require('path');

const links = require('../lib/plugins/links');
const {callPlugin, tokenize} = require('./utils');
const {title, customTitle} = require('./data/links');

const callLinksPlugin = callPlugin.bind(null, links);

describe('Links', () => {
    test('Should create link with custom title', () => {
        const mocksPath = require.resolve('./utils.js');

        const result = callLinksPlugin(tokenize([
            'Text before include',
            '',
            '[Custom title](./mocks/link.md) %}',
            '',
            'After include'
        ]), {
            path: mocksPath,
            root: dirname(mocksPath)
        });

        expect(result).toEqual(customTitle);
    });

    test('Should create link with custom title', () => {
        const mocksPath = require.resolve('./utils.js');

        const result = callLinksPlugin(tokenize([
            'Text before include',
            '',
            '[#T](./mocks/include.md)',
            '',
            'After include'
        ]), {
            path: mocksPath,
            root: dirname(mocksPath)
        });

        expect(result).toEqual(title);
    });
});
