import yfmlint from '../../src/transform/yfmlint';
import merge from 'lodash/merge';
import {log, LogLevels} from '../../src/transform/log';

const testInput = `
\`single-line inline code\` \`another single-line inline code\`

\`
multi-line inline code
\`

\`
another multi-line
inline code
\`

\`|\`

\`\`\`
prefix \`inline quotes inside block code\` postfix
prefix \`another inline quotes inside block code\` postfix
\`\`\`

\`\`\`sql
block code
\`\`\`

    \`\`\`sql
    indented block code
    \`\`\`

\`, ?, !

Some text for testing not escaped and not closed quote
\`
`.trim();

const lintConfig = {
    'log-levels': {
        MD046: LogLevels.DISABLED,
        MD047: LogLevels.DISABLED,
        YFM002: LogLevels.DISABLED,
    },
};

describe('YFM001', () => {
    beforeEach(() => {
        log.clear();
    });

    it('All inline codes are shorter than value', () => {
        yfmlint({
            input: testInput,
            pluginOptions: {log, path: 'test1.md'},
            lintConfig,
        });

        expect(log.isEmpty()).toEqual(true);
    });

    it('All inline codes are longer than value', () => {
        yfmlint({
            input: testInput,
            pluginOptions: {log, path: 'test2.md'},
            lintConfig: {...lintConfig, YFM001: {maximum: 5}},
        });

        expect(log.get().warn.length).toEqual(3);
    });

    it('Change log level', () => {
        yfmlint({
            input: testInput,
            pluginOptions: {log, path: 'test3.md'},
            lintConfig: merge({}, lintConfig, {
                YFM001: {maximum: 5},
                'log-levels': {
                    YFM001: LogLevels.ERROR,
                },
            }),
        });

        expect(log.get().error.length).toEqual(3);
    });
});
