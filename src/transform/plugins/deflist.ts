// @ts-expect-error
import deflist from 'markdown-it-deflist';
import {MarkdownItPluginCb} from './typings';

export = deflist as MarkdownItPluginCb;
