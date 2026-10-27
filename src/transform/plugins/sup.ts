import type {MarkdownItPluginCb} from './typings';

// @ts-expect-error
import sup from 'markdown-it-sup';

export default sup as MarkdownItPluginCb;
