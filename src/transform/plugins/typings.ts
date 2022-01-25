import {Logger} from '../log';
import {MarkdownIt} from '../typings';

export interface MarkdownItPluginOpts {
    path: string;
    log: typeof Logger;
    lang: 'ru' | 'en';
    root: string;
}

export type MarkdownItPluginCb<T = {}> = (md: MarkdownIt, opts: T & MarkdownItPluginOpts) => void;
