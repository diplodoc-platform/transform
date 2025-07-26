import type {Dictionary} from 'lodash';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type {Plugin, Rule} from 'markdownlint';
import type {MarkdownItPreprocessorCb} from '../typings';
import type {LintConfig, PluginOptions} from '.';

export interface Options {
    input: string;
    plugins?: Function[] | Plugin;
    preprocessors?: MarkdownItPreprocessorCb[];
    pluginOptions: PluginOptions;
    defaultLintConfig?: LintConfig;
    lintConfig?: LintConfig;
    customLintRules?: Rule[];
    sourceMap?: Dictionary<string>;
    // TODO: set false in next major
    /** @default true */
    enableMarkdownAttrs?: boolean;
    disableInlineCode?: boolean;
}
