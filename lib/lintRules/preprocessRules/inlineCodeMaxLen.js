const {bold} = require('chalk');

const {LOG_LEVELS} = require('../../constants');
const {getInlineCodes} = require('../../utils');

const ruleName = 'inline-code-max-len';

const defaultRuleOptions = {
    level: LOG_LEVELS.WARN,
    value: 100,
};

function inlineCodeMaxLen({input, ruleOptions: customRuleOptions, commonOptions}) {
    const {path, log} = commonOptions;
    const ruleOptions = {...defaultRuleOptions, ...customRuleOptions};
    let {value} = ruleOptions;
    const {level} = ruleOptions;

    if (value < 0) {
        value = defaultRuleOptions.value;
    }

    const inlineCodes = getInlineCodes(input);

    for (const [line, lineNumber] of inlineCodes) {
        if (line.length > value) {
            log[level](`Length of inline code is longer than ${value}: line ${lineNumber} in ${bold(path)}.` +
                ` Use the block code instead of the inline code. (${ruleName})`);
        }
    }
}

inlineCodeMaxLen.ruleName = ruleName;
inlineCodeMaxLen.ruleOptions = defaultRuleOptions;

module.exports = inlineCodeMaxLen;
