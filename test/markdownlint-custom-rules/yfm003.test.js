const {log} = require('../utils');
const yfmlint = require('../../lib/yfmlint');
const links = require('../../lib/plugins/links');

describe('YFM003', () => {
    beforeEach(() => {
        log.clear();
    });

    test('Link is unreachable', () => {
        yfmlint({
            input: '[{#T}](./test/mocks/non-existent.md)\n',
            pluginOptions: {log, path: 'test'},
            plugins: [links],
        });

        expect(log.get().error[0].includes('YFM003')).toEqual(true);
    });
});
