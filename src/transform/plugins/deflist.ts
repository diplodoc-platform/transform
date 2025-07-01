import type {MarkdownItPluginCb} from './typings';

// @ts-expect-error
import deflist from 'markdown-it-deflist';

export = deflist as MarkdownItPluginCb;
