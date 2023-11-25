import {Rule, sync} from 'markdownlint';
import merge from 'lodash/merge';
import union from 'lodash/union';
import attrs from 'markdown-it-attrs';
import baseDefaultLintConfig from './yfmlint';

import {
    yfm001,
    yfm002,
    yfm003,
    yfm004,
    yfm005,
    yfm006,
    yfm007,
    yfm008,
} from './markdownlint-custom-rule';

import {errorToString, getLogLevel} from './utils';
import {Options} from './typings';
import {Dictionary} from 'lodash';
import {Logger, LogLevels} from '../log';
import {yfm009} from './markdownlint-custom-rule/yfm009';

const defaultLintRules = [yfm001, yfm002, yfm003, yfm004, yfm005, yfm006, yfm007, yfm008, yfm009];

const lintCache = new Set();

function yfmlint(opts: Options) {
    const {input, plugins: customPlugins, pluginOptions, customLintRules, sourceMap} = opts;
    const {path = 'input', log} = pluginOptions;

    pluginOptions.isLintRun = true;

    const {
        LogLevels: {ERROR, WARN, DISABLED},
    } = log;

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

    const plugins = customPlugins && [attrs, ...customPlugins];
    const preparedPlugins = plugins && plugins.map((plugin) => [plugin, pluginOptions]);

    let result;
    try {
        result = sync({
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
        const logLevel = getLogLevel({
            logLevelsConfig,
            ruleNames: error.ruleNames,
            defaultLevel: WARN,
        });

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

export = yfmlint;

// eslint-disable-next-line @typescript-eslint/no-namespace, no-redeclare
namespace yfmlint {
    export interface LintMarkdownFunctionOptions {
        input: string;
        path: string;
        sourceMap?: Dictionary<string>;
    }

    export interface EnvApi {
        root: string;
        distRoot: string;
        copyFile: (from: string, to: string) => void;
        copyFileAsync: (from: string, to: string) => void;
        writeFile: (to: string, data: string | Uint8Array) => void;
        writeFileAsync: (to: string, data: string | Uint8Array) => void;
        readFile: (path: string, encoding: BufferEncoding) => string | Uint8Array;
        fileExists: (path: string) => boolean;
        getFileVars: (path: string) => Record<string, string>;
    }

    export interface PluginOptions {
        log: Logger;
        path?: string;
        disableLint?: boolean;
        lintMarkdown?: (opts: LintMarkdownFunctionOptions) => void;
        [key: string]: unknown;
        envApi?: EnvApi;
    }

    export interface LintConfig {
        default?: boolean;
        'log-levels': Record<string, LogLevels>;
        [x: string]: unknown;
    }

    export type LintRule = Rule;
}
