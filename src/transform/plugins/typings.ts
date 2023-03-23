import type Token from 'markdown-it/lib/token';
import type {Logger} from '../log';
import type {MarkdownIt, EnvType} from '../typings';

export interface MarkdownItPluginOpts {
    path: string;
    log: Logger;
    lang: 'ru' | 'en';
    root: string;
    isLintRun: boolean;
}

export type MarkdownItPluginCb<T extends {} = {}> = {
    (md: MarkdownIt, opts: T & MarkdownItPluginOpts): void;
} & {
    process?: MarkdownItPluginProcessor;
};

export type MarkdownItPluginProcessor = (
    tokens: Token[],
    md: MarkdownIt,
    env: EnvType,
) => Promise<Token[]>;
