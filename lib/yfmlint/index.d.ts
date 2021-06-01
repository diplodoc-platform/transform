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

export interface PluginOptions {
    log: Logger;
    path?: string;
    [key: string]: any;
}

export interface Options {
    input: string;
    plugins?: Function[];
    pluginOptions: PluginOptions;
    lintConfig?: LintConfig;
    customLintRules?: LintRule[];
}

export default function yfmlint(options: Options): void;
