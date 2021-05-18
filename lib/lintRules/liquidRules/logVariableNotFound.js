const {bold} = require('chalk');
const {LOG_LEVELS} = require('../../constants');

const ruleName = 'liquid-variable-not-found';

const defaultRuleOptions = {
    level: LOG_LEVELS.WARN,
};

function logVariableNotFound({ruleOptions, commonOptions}) {
    const {path, varPath, log} = commonOptions;
    const {level} = ruleOptions;

    log[level](`Variable ${bold(varPath)} not found${path ? ` in ${bold(path)}` : ''}. (${ruleName})`);
}

logVariableNotFound.ruleName = ruleName;
logVariableNotFound.ruleOptions = defaultRuleOptions;

module.exports = logVariableNotFound;
