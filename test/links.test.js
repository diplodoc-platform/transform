const {dirname} = require('path');

const links = require('../lib/plugins/links');
const {callPlugin, tokenize} = require('./utils');
const {title, customTitle} = require('./data/links');

const {log} = require('./utils');

const callLinksPlugin = callPlugin.bind(null, links);

describe('Links', () => {
    test('Should create link with custom title', () => {
        const mocksPath = require.resolve('./utils.js');

        const result = callLinksPlugin(tokenize([
            'Text before link',
            '',
            '[Custom title](./mocks/link.md) %}',
            '',
            'After link',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
        });

        expect(result).toEqual(customTitle);
    });

    test('Should create link with title from target', () => {
        const mocksPath = require.resolve('./utils.js');

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

    describe('Linting', () => {
        beforeEach(() => {
            log.clear();
        });

        test('Empty link warn', () => {
            const mocksPath = require.resolve('./utils.js');

            callLinksPlugin(tokenize(['[Text]()']), {
                path: mocksPath,
                root: dirname(mocksPath),
                log,
            });

            expect(log.get().warn[0].includes('Empty link in')).toEqual(true);
        });

        test('Empty link error', () => {
            const mocksPath = require.resolve('./utils.js');

            callLinksPlugin(tokenize(['[Text]()']), {
                path: mocksPath,
                root: dirname(mocksPath),
                log,
                lintOptions: {'links-empty-href': {level: 'error'}},
            });

            expect(log.get().error[0].includes('Empty link in')).toEqual(true);
        });

        test('Empty link disabled', () => {
            const mocksPath = require.resolve('./utils.js');

            callLinksPlugin(tokenize(['[Text]()']), {
                path: mocksPath,
                root: dirname(mocksPath),
                log,
                lintOptions: {'links-empty-href': {level: 'error', disabled: true}},
            });

            expect(log.get().error.length).toEqual(0);
        });
    });
});
