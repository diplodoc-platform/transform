const {log} = require('../utils');
const yfmlint = require('../../lib/yfmlint');
const links = require('../../lib/plugins/links');

describe('YFM002', () => {
    beforeEach(() => {
        log.clear();
    });

    test('No header found in the file for the link text', () => {
        yfmlint({
            input: '[{#T}](./test/mocks/yfm002.md)\n',
            pluginOptions: {log, path: 'test'},
            plugins: [links],
        });

        expect(log.get().warn[0].includes('YFM002')).toEqual(true);
    });
});
