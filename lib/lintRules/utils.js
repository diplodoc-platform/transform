const {LOG_LEVELS, LOG_LEVELS_PRIORITIES} = require('../constants');

function isSupportedLevel(level) {
    return Object.values(LOG_LEVELS).includes(level);
}

function compareLogLevels(levelA, levelB) {
    return LOG_LEVELS_PRIORITIES[levelA] - LOG_LEVELS_PRIORITIES[levelB];
}

function withLintRuleProperties(wrapper, lintRule) {
    wrapper.ruleName = lintRule.ruleName;
    wrapper.ruleOptions = lintRule.ruleOptions;

    return wrapper;
}

function withCheckDisabledRule(lintRule) {
    function wrapper(params) {
        const {ruleOptions} = params;

        if (ruleOptions.disabled) {
            return;
        }

        lintRule(params);
    }

    return withLintRuleProperties(wrapper, lintRule);
}

function getCountLogMessages(log, level) {
    return log.get()[level].length;
}

function withValidationLevelOptions(lintRule) {
    function wrapper(params) {
        const {ruleOptions, commonOptions: {log, path}} = params;
        const {level} = ruleOptions;

        if (isSupportedLevel(level)) {
            const messageCount = getCountLogMessages(log, level);

            lintRule(params);

            if (getCountLogMessages(log, level) > messageCount &&
                compareLogLevels(lintRule.ruleOptions.level, level) > 0
            ) {
                log.warn(`The log level of lint rule "${lintRule.ruleName}" was decreased. ` +
                    `This can lead to problems with content in ${path}`);
            }
        } else {
            lintRule({...params, ruleOptions: {
                ...ruleOptions,
                level: lintRule.ruleOptions.level,
            }});
        }
    }

    return withLintRuleProperties(wrapper, lintRule);
}

function withDefaultOptions(lintRule) {
    function wrapper(params) {
        const {ruleOptions: customRuleOptions} = params;
        const defaultRuleOptions = lintRule.ruleOptions || {};
        const ruleOptions = {...defaultRuleOptions, ...customRuleOptions};

        lintRule({...params, ruleOptions});
    }

    return withLintRuleProperties(wrapper, lintRule);
}

function withOwnOptions(lintRule) {
    function wrapper(params) {
        const {lintOptions = {}, commonOptions = {}} = params;

        if (commonOptions.disableLint) {
            return;
        }

        const ruleOptions = lintOptions[lintRule.ruleName] || {};

        lintRule({...params, ruleOptions});
    }

    return withLintRuleProperties(wrapper, lintRule);
}

function withLintRuleWrapper(lintRule) {
    return withOwnOptions(
        withDefaultOptions(
            withCheckDisabledRule(
                withValidationLevelOptions(
                    lintRule,
                ))));
}

module.exports = {
    withLintRuleWrapper,
    isSupportedLevel,
    compareLogLevels,
};


