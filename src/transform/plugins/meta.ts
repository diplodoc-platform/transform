import type {MarkdownItPluginCb} from './typings';

// @ts-expect-error
import meta from 'markdown-it-meta';

export = meta as MarkdownItPluginCb;
