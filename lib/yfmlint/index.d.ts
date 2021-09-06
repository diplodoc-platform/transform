import {Logger} from '../log';

export interface LintRule {
    names: string[];
    description: string;
    tags: string[];
    function: Function;
}

export interface LintConfig {
    [key: string]: any;
}

export interface LintMarkdownFunctionOptions {
    input: string;
    path: string;
}

export interface PluginOptions {
    log: Logger;
    path?: string;
    disableLint?: boolean;
    lintMarkdown?: (opts: LintMarkdownFunctionOptions) => void;
    [key: string]: any;
}

export interface Options {
    input: string;
    plugins?: Function[];
    pluginOptions: PluginOptions;
    lintConfig?: LintConfig;
    customLintRules?: LintRule[];
    sourceMap?: object;
}

export default function yfmlint(options: Options): void;
