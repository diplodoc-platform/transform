const {bold} = require('chalk');

const {LOG_LEVELS} = require('../../constants');

const TITLE_RE = /^#{1,}[^\s#]{1}.*$/;
const linkToSyntax = 'https://www.markdownguide.org/basic-syntax/#headings';

const ruleName = 'title-syntax';

const defaultRuleOptions = {
    level: LOG_LEVELS.WARN,
};

function titleSyntax({input, ruleOptions: customRuleOptions, commonOptions}) {
    const {path, log} = commonOptions;
    const ruleOptions = {...defaultRuleOptions, ...customRuleOptions};
    const {level} = ruleOptions;

    const lines = input.split('\n');
    let isBlockCodeStarted = false;

    lines.forEach((line, index) => {
        if (line.startsWith('```')) {
            isBlockCodeStarted = !isBlockCodeStarted;

            return;
        } else if (isBlockCodeStarted) {
            return;
        }

        const wrongTitle = line.match(TITLE_RE);

        if (wrongTitle) {
            log[level](`Incorrect syntax for title: line ${index + 1} in ${bold(path)}. ` +
                `Check out syntax: ${linkToSyntax}. (${ruleName})`);
        }
    });
}

titleSyntax.ruleName = ruleName;
titleSyntax.ruleOptions = defaultRuleOptions;

module.exports = titleSyntax;
