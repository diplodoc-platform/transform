
const {dirname} = require('path');

const includes = require('../lib/plugins/includes');
const {callPlugin, tokenize} = require('./utils');
const {title, notitle} = require('./data/includes');

const callIncludesPlugin = callPlugin.bind(null, includes);

describe('Includes', () => {
    test('Should include with title', () => {
        const mocksPath = require.resolve('./utils.js');

        const result = callIncludesPlugin(tokenize([
            'Text before include',
            '',
            '{% include [create-folder](./mocks/include.md) %}',
            '',
            'After include',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
        });

        expect(result).toEqual(title);
    });

    test('Should include without title', () => {
        const mocksPath = require.resolve('./utils.js');

        const result = callIncludesPlugin(tokenize([
            'Text before include',
            '',
            '{% include notitle [create-folder](./mocks/include.md) %}',
            '',
            'After include',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
        });

        expect(result).toEqual(notitle);
    });

    test('Should call notFoundCb for exception', () => {
        const mocksPath = require.resolve('./utils.js');
        const cb = jest.fn();

        callIncludesPlugin(tokenize([
            'Text before include',
            '',
            '{% include notitle [create-folder](./mocks/fake.md) %}',
            '',
            'After include',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
            notFoundCb: cb,
        });

        expect(cb.mock.calls[0][0]).toEqual('/mocks/fake.md');
    });
});
