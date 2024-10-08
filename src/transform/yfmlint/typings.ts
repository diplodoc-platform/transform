import type {Dictionary} from 'lodash';

import {Plugin, Rule} from 'markdownlint';

import {MarkdownItPreprocessorCb} from '../typings';

import {LintConfig, PluginOptions} from '.';

export interface Options {
    input: string;
    plugins?: Function[] | Plugin;
    preprocessors?: MarkdownItPreprocessorCb[];
    pluginOptions: PluginOptions;
    defaultLintConfig?: LintConfig;
    lintConfig?: LintConfig;
    customLintRules?: Rule[];
    sourceMap?: Dictionary<string>;
}
