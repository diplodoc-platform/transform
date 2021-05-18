const {bold} = require('chalk');
const {LOG_LEVELS} = require('../../../constants');

const ruleName = 'links-empty-href';

const defaultRuleOptions = {
    level: LOG_LEVELS.WARN,
};

function logEmptyLinkHref({ruleOptions, commonOptions}) {
    const {path, log} = commonOptions;
    const {level} = ruleOptions;

    log[level](`Empty link in ${bold(path)}`);
}

logEmptyLinkHref.ruleName = ruleName;
logEmptyLinkHref.ruleOptions = defaultRuleOptions;

module.exports = logEmptyLinkHref;
