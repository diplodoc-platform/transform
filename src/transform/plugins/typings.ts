import type {Logger} from '../log';
import type {MarkdownIt} from '../typings';

export interface MarkdownItPluginOpts {
    path: string;
    log: Logger;
    lang: 'ru' | 'en';
    root: string;
    isLintRun: boolean;
}

export type MarkdownItPluginCb<T extends {} = {}> = {
    (md: MarkdownIt, opts: T & MarkdownItPluginOpts): void;
};

export interface ChangeLogItem {
    title: string;
    image: {
        src: string;
        alt: string;
        ratio?: string;
    };
    description: string;
    date: string;
    [x: string]: unknown;
}
