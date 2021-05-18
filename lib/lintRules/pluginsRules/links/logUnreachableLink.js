const {bold} = require('chalk');
const {LOG_LEVELS} = require('../../../constants');

const ruleName = 'unreachable-link';

const defaultRuleOptions = {
    level: LOG_LEVELS.ERROR,
};

function logUnreachableLink({ruleOptions, commonOptions}) {
    const {path, log, href} = commonOptions;
    const {level} = ruleOptions;

    log[level](`Link is unreachable: ${bold(href)} in ${bold(path)}. (${ruleName})`);
}

logUnreachableLink.ruleName = ruleName;
logUnreachableLink.ruleOptions = defaultRuleOptions;

module.exports = logUnreachableLink;
