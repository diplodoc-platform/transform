const {dirname} = require('path');

const includes = require('../lib/plugins/includes');
const yfmlint = require('../lib/yfmlint');
const {callPlugin, tokenize, log} = require('./utils');
const {title, notitle} = require('./data/includes');

const callIncludesPlugin = callPlugin.bind(null, includes);

describe('Includes', () => {
    beforeEach(() => {
        log.clear();
    });

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
            log,
        });

        expect(cb.mock.calls[0][0]).toEqual('/mocks/fake.md');
    });

    test('Lint include file', () => {
        const mocksPath = require.resolve('./utils.js');
        const input = [
            'Text before include',
            '{% include [create-folder](./mocks/include-lint-test.md) %}',
            'After include',
        ].join('\n\n');

        function lintMarkdown({input, path}) {
            yfmlint({
                input,
                pluginOptions: {
                    log,
                    path,
                    root: dirname(mocksPath),
                    lintMarkdown,
                },
                plugins: [includes],
            });
        }

        lintMarkdown({input, path: mocksPath});

        const errorMessage = log.get().warn[0];
        const expectedCondition = errorMessage.includes('include-lint-test.md: 3: YFM001/inline-code-length');

        expect(expectedCondition).toEqual(true);
    });
});
