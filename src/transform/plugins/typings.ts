import type {Logger} from '../log';
import type {CacheContext, MarkdownIt} from '../typings';

export interface MarkdownItPluginOpts {
    path: string;
    log: Logger;
    lang: 'ru' | 'en' | 'es' | 'fr' | 'cs' | 'ar' | 'he';
    root: string;
    rootPublicPath: string;
    isLintRun: boolean;
    cache?: CacheContext;
}

export type MarkdownItPluginCb<T extends {} = {}> = {
    (md: MarkdownIt, opts: T & MarkdownItPluginOpts): void;
};
