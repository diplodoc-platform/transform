import {Dictionary} from 'lodash';
import {Plugin, Rule} from 'markdownlint';
import {LintConfig, PluginOptions} from '.';

export interface Options {
    input: string;
    plugins?: Function[] | Plugin;
    pluginOptions: PluginOptions;
    defaultLintConfig?: LintConfig;
    lintConfig?: LintConfig;
    customLintRules?: Rule[];
    sourceMap?: Dictionary<string>;
}
