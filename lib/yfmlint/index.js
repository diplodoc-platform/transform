const markdownlint = require('markdownlint');
const merge = require('lodash/merge');
const union = require('lodash/union');
const baseDefaultLintConfig = require('./yfmlint');

const {
    yfm001,
    yfm002,
    yfm003,
    yfm004,
    yfm005,
} = require('./markdownlint-custom-rule');

const {errorToString, getLogLevel} = require('./utils');

const defaultLintRules = [
    yfm001,
    yfm002,
    yfm003,
    yfm004,
    yfm005,
];

const lintCache = new Set();

function yfmlint(opts = {}) {
    const {input, plugins, pluginOptions, customLintRules, sourceMap} = opts;
    const {path = 'input', log} = pluginOptions;
    const {LOG_LEVELS: {ERROR, WARN, DISABLED}} = log;

    if (lintCache.has(path)) {
        return;
    }

    lintCache.add(path);

    const defaultLintConfig = opts.defaultLintConfig || baseDefaultLintConfig;
    let lintConfig = defaultLintConfig;
    if (opts.lintConfig) {
        lintConfig = merge({}, defaultLintConfig, opts.lintConfig);
    }

    let lintRules = defaultLintRules;
    if (customLintRules) {
        lintRules = union(lintRules, customLintRules);
    }

    Object.assign(pluginOptions, {
        /* When yfmlint processes input data with inclusions, we have the origin lines and tokens with replaced
           inclusions in the lint rule.
           Problem 1: The included tokens have a map for the lines of the included file.
           Problem 2: First the included file is linted, then the origin file is linted. There are double messages in
           stdout if the includes plugin makes a replacement.
        */
        noReplaceInclude: true,
    });
    const preparedPlugins = plugins && plugins.map((plugin) => [plugin, pluginOptions]);

    let result;
    try {
        result = markdownlint.sync({
            strings: {[path]: input},
            markdownItPlugins: preparedPlugins,
            handleRuleFailures: true,
            config: lintConfig,
            customRules: lintRules,
        });
    } catch {}

    const errors = result && result[path];
    if (!errors) {
        return;
    }

    const logLevelsConfig = lintConfig['log-levels'];

    for (const error of errors) {
        const message = errorToString(path, error, sourceMap);
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
