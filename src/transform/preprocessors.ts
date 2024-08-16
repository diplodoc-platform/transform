import type {MarkdownItPreprocessorCb} from './plugins/typings';

import included from './preprocessors/included';

const defaultPreprocessors = [included] as MarkdownItPreprocessorCb[];

export = defaultPreprocessors;
