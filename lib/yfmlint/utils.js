function errorToString(path, error, sourceMap) {
    const ruleMoniker = error.ruleNames
        ? error.ruleNames.join('/')
        : error.ruleName + '/' + error.ruleAlias;
    const lineNumber = sourceMap ? sourceMap[error.lineNumber] : error.lineNumber;

    return (
        `${path}${lineNumber ? `: ${lineNumber}:` : ':'} ${ruleMoniker} ${error.ruleDescription}` +
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
