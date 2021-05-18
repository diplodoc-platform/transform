const {titleSyntax} = require('../../lib/lintRules/preprocessRules');
const {log} = require('../utils');
const {LOG_LEVELS} = require('../../lib/constants');

const testInput = `
# Correct title h1

## Correct title h2

#Invalid title h1

##Invalid title h2
`.trim();

describe('title-syntax rule', () => {
    beforeEach(() => {
        log.clear();
    });

    it('Two errors', () => {
        titleSyntax({
            input: testInput,
            lintOptions: {[titleSyntax.ruleName]: {level: LOG_LEVELS.ERROR}},
            commonOptions: {log, path: ''},
        });

        expect(log.get().error.length).toEqual(2);
    });

    it('Two warns', () => {
        titleSyntax({
            input: testInput,
            commonOptions: {log, path: ''},
        });

        expect(log.get().warn.length).toEqual(2);
    });

    it('Disabled', () => {
        titleSyntax({
            input: testInput,
            lintOptions: {[titleSyntax.ruleName]: {level: LOG_LEVELS.WARN, disabled: true}},
            commonOptions: {log, path: ''},
        });

        expect(log.get().warn.length).toEqual(0);
    });
});
