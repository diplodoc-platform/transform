import {log, LogLevels} from '../../src/transform/log';
import table from '../../src/transform/plugins/table';
import yfmlint from '../../src/transform/yfmlint';
import {yfm004} from '../../src/transform/yfmlint/markdownlint-custom-rule';

const tableWithoutCloseToken = `
#|
|| Cell in column 1, row 1
|Cell in column 2, row 1 ||

|| Cell in column 1, row 2
|Cell in column 2, row 2 ||
`.trim();

const tableWithCloseToken = `
#|
|| Cell in column 1, row 1
|Cell in column 2, row 1 ||

|| Cell in column 1, row 2
|Cell in column 2, row 2 ||
|#
`.trim();

const lint = (input: string) => {
    yfmlint({
        input,
        pluginOptions: {log, path: 'test.md'},
        lintConfig: {
            'log-levels': {
                MD047: LogLevels.DISABLED,
                YFM004: LogLevels.ERROR,
                MD018: LogLevels.DISABLED,
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
