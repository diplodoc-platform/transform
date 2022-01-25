import {Rule} from 'markdownlint';
import {Logger, LogLevels} from '../log';

export interface LintConfig {
    default?: boolean;
    'log-levels': Record<string, LogLevels>;
    [x: string]: unknown;
}

export interface LintMarkdownFunctionOptions {
    input: string;
    path: string;
    sourceMap?: object;
}

export interface PluginOptions {
    log: typeof Logger;
    path?: string;
    disableLint?: boolean;
    lintMarkdown?: (opts: LintMarkdownFunctionOptions) => void;
    [key: string]: unknown;
}

export interface Options {
    input: string;
    plugins?: Function[];
    pluginOptions: PluginOptions;
    defaultLintConfig?: LintConfig;
    lintConfig?: LintConfig;
    customLintRules?: Rule[];
    sourceMap?: Record<number, number>;
}
