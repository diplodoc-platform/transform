function errorToString(path, error) {
    const ruleMoniker = error.ruleNames
        ? error.ruleNames.join('/')
        : error.ruleName + '/' + error.ruleAlias;

    return (
        `${path}: ${error.lineNumber}: ${ruleMoniker} ${error.ruleDescription}` +
        (error.errorDetail ? ` [${error.errorDetail}]` : '') +
        (error.errorContext ? ` [Context: "${error.errorContext}"]` : '')
    );
}

function getLogLevel({ruleNames, logLevelsConfig, defaultLevel}) {
    const ruleName = ruleNames.filter((ruleName) => logLevelsConfig[ruleName])[0];

    return logLevelsConfig[ruleName] || defaultLevel;
}

module.exports = {
    errorToString,
    getLogLevel,
};
