import {Logger} from '../log';
import {MarkdownIt} from '../typings';

export interface MarkdownItPluginOpts {
    path: string;
    log: Logger;
    lang: 'ru' | 'en';
    root: string;
    isLintRun: boolean;
}

export type MarkdownItPluginCb<T = {}> = (md: MarkdownIt, opts: T & MarkdownItPluginOpts) => void;
