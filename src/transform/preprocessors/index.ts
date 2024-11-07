import type {MarkdownIt, MarkdownItPluginOpts, MarkdownItPreprocessorCb} from '../plugins/typings';
import type {PluginOptions} from '../yfmlint';

import included from './included';

const defaultPreprocessors = [included] as MarkdownItPreprocessorCb[];

export default defaultPreprocessors;

export function preprocess(
    content: string,
    pluginOptions: MarkdownItPluginOpts | PluginOptions | unknown,
    options?: Partial<MarkdownItPluginOpts> & {
        preprocessors?: MarkdownItPreprocessorCb[];
    },
    md?: MarkdownIt,
) {
    const {preprocessors = defaultPreprocessors} = options ?? {};

    for (const preprocessor of preprocessors) {
        content = preprocessor(content, pluginOptions as MarkdownItPluginOpts, md);
    }

    return content;
}
