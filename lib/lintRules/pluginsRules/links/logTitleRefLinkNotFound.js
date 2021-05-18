const {bold} = require('chalk');
const {LOG_LEVELS} = require('../../../constants');

const ruleName = 'title-ref-link-not-found';

const defaultRuleOptions = {
    level: LOG_LEVELS.WARN,
};

function logTitleRefLinkNotFound({ruleOptions, commonOptions}) {
    const {path, href, log} = commonOptions;
    const {level} = ruleOptions;

    log[level](`Title not found: ${bold(href)} in ${bold(path)}. (${ruleName})`);
}

logTitleRefLinkNotFound.ruleName = ruleName;
logTitleRefLinkNotFound.ruleOptions = defaultRuleOptions;

module.exports = logTitleRefLinkNotFound;
