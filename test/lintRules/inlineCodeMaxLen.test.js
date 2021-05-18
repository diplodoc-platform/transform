const {inlineCodeMaxLen} = require('../../lib/lintRules/preprocessRules');
const {getInlineCodes} = require('../../lib/utils');
const {LOG_LEVELS} = require('../../lib/constants');
const {log} = require('../utils');

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
`.trim();

const inlineCodes = [
    ['single-line inline code', 1],
    ['another single-line inline code', 1],
    ['multi-line inline code', 3],
    ['another multi-line inline code', 7],
    ['|', 12],
];

describe('inline-code-max-len rule', () => {
    beforeEach(() => {
        log.clear();
    });

    it('Test function for getting inline codes', () => {
        expect(getInlineCodes(testInput)).toEqual(inlineCodes);
    });

    it('All inline codes are shorter than value', () => {
        inlineCodeMaxLen({
            input: testInput,
            lintOptions: {[inlineCodeMaxLen.ruleName]: {value: 80}},
            commonOptions: {log, path: ''},
        });

        expect(log.isEmpty()).toEqual(true);
    });

    it('All inline codes are longer than value', () => {
        inlineCodeMaxLen({
            input: testInput,
            lintOptions: {[inlineCodeMaxLen.ruleName]: {value: 5}},
            commonOptions: {log, path: ''},
        });

        expect(log.get().warn.length).toEqual(4);
    });

    it('Change log level', () => {
        inlineCodeMaxLen({
            input: testInput,
            lintOptions: {[inlineCodeMaxLen.ruleName]: {value: 5, level: LOG_LEVELS.ERROR}},
            commonOptions: {log, path: ''},
        });

        expect(log.get().error.length).toEqual(4);
    });
});
