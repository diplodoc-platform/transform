const markdownlint = require('markdownlint');
const merge = require('lodash/merge');
const union = require('lodash/union');
const defaultLintConfig = require('./yfmlint');

const {
    yfm001,
    yfm002,
    yfm003,
} = require('./markdownlint-custom-rule');

const {errorToString, getLogLevel} = require('./utils');

const defaultLintRules = [
    yfm001,
    yfm002,
    yfm003,
];

function yfmlint(opts = {}) {
    const {input, plugins, pluginOptions, customLintRules} = opts;
    const {path = 'input', log} = pluginOptions;
    const {LOG_LEVELS: {ERROR, WARN, DISABLED}} = log;

    let lintConfig = defaultLintConfig;
    if (opts.lintConfig) {
        lintConfig = merge({}, defaultLintConfig, opts.lintConfig);
    }

    let lintRules = defaultLintRules;
    if (customLintRules) {
        lintRules = union(lintRules, customLintRules);
    }

    const preparedPlugins = plugins && plugins.map((plugin) => [plugin, pluginOptions]);

    const result = markdownlint.sync({
        strings: {[path]: input},
        markdownItPlugins: preparedPlugins,
        handleRuleFailures: true,
        config: lintConfig,
        customRules: lintRules,
    });

    const errors = result[path];
    if (!errors) {
        return;
    }

    const logLevelsConfig = lintConfig['log-levels'];

    for (const error of errors) {
        const message = errorToString(path, error);
        const logLevel = getLogLevel({logLevelsConfig, ruleNames: error.ruleNames, defaultLevel: WARN});

        switch (logLevel) {
            case ERROR:
                log.error(message);
                break;
            case WARN:
                log.warn(message);
                break;
            case DISABLED:
            default:
                break;
        }
    }
}

module.exports = yfmlint;
