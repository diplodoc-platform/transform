const table = require('../../lib/plugins/table');
const yfmlint = require('../../lib/yfmlint');
const {yfm004} = require('../../lib/yfmlint/markdownlint-custom-rule');
const {log} = require('../utils');

const tableWithoutCloseToken = `
|===
|Cell in column 1, row 1
|Cell in column 2, row 1

|Cell in column 1, row 2
|Cell in column 2, row 2
`.trim();

const tableWithCloseToken = `
|===
|Cell in column 1, row 1
|Cell in column 2, row 1

|Cell in column 1, row 2
|Cell in column 2, row 2
|===
`.trim();

const lint = (input) => {
    yfmlint({
        input,
        pluginOptions: {log, path: 'test.md'},
        lintConfig: {
            'log-levels': {
                MD047: 'disabled',
                YFM004: 'error',
            },
        },
        customLintRules: [yfm004],
        plugins: [table],
    });
};

describe('YFM004', () => {
    beforeEach(() => {
        log.clear();
    });

    it('Table without close token', () => {
        lint(tableWithoutCloseToken);
        expect(log.get().error[0]).toMatch('YFM004');
    });

    it('Table with close token', () => {
        lint(tableWithCloseToken);
        expect(log.isEmpty()).toBeTruthy();
    });
});
