const {readFileSync} = require('fs');
const {resolve} = require('path');

const {log} = require('../utils');
const yfmlint = require('../../lib/yfmlint');
const anchors = require('../../lib/plugins/anchors');
const includes = require('../../lib/plugins/includes');
const links = require('../../lib/plugins/links');

describe('YFM004', () => {
    beforeEach(() => {
        log.clear();
    });

    test('Link is unreachable, hash does not exist', () => {

        const root = resolve(__dirname, '../mocks/validateAnchors');
        const path = `${root}/index.md`;
        const input = readFileSync(path, 'utf8');

        yfmlint({
            input,
            pluginOptions: {log, root, path},
            plugins: [
                includes,
                links,
                anchors,
            ],
        });

        expect(log.get().error).toEqual([]);
    });
});
