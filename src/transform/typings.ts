import {LanguageFn} from 'highlight.js';
import DefaultMarkdownIt from 'markdown-it';
import DefaultStateCore from 'markdown-it/lib/rules_core/state_core';

import {SanitizeOptions} from './sanitize';
import {LogLevels, Logger} from './log';
import {ChangelogItem} from './plugins/changelog/types';

export interface MarkdownIt extends DefaultMarkdownIt {
    assets?: string[];
    meta?: string[];
}

export interface StateCore extends DefaultStateCore {
    md: MarkdownIt;
}

export interface CacheContext {
    get(key: string): string | null | undefined;
    set(key: string, value: string | null | undefined): void;
}

export type HighlightLangMap = Record<string, LanguageFn>;

export type Heading = {
    title: string;
    href: string;
    level: number;
    items?: Heading[];
};

export interface FsContext {
    read(path: string | null): string;
    exist(path: string | null): boolean;
    write(path: string | null, content: string): void;
    readAsync(path: string | null): Promise<string>;
    existAsync(path: string | null): Promise<boolean>;
    writeAsync(path: string | null, content: string): Promise<void>;
}

export interface DependencyContext {
    resetDeps?(path: string): void;
    markDep?(path: string, dependencyPath: string, type?: string): void;
    unmarkDep?(path: string, dependencyPath: string, type?: string): void;
}

export interface RevisionMeta {
    files: {
        [key: string]: {
            mod_date: number; // modified_at
            dependencies: {
                [type: string]: string[];
            };
            changed: boolean;
        };
    };
}

export interface RevisionContext {
    files: string[];
    meta: RevisionMeta;
}

export interface OptionsType {
    vars?: Record<string, string>;
    path?: string;
    extractTitle?: boolean;
    needTitle?: boolean;
    allowHTML?: boolean;
    linkify?: boolean;
    linkifyTlds?: string | string[];
    breaks?: boolean;
    conditionsInCode?: boolean;
    disableLiquid?: boolean;
    leftDelimiter?: string;
    rightDelimiter?: string;
    isLiquided?: boolean;
    needToSanitizeHtml?: boolean;
    sanitizeOptions?: SanitizeOptions;
    needFlatListHeadings?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: MarkdownItPluginCb<any>[];
    preprocessors?: MarkdownItPreprocessorCb[]; // Preprocessors should modify the input before passing it to MD
    highlightLangs?: HighlightLangMap;
    disableRules?: string[];
    extractChangelogs?: boolean;
    root?: string;
    rootPublicPath?: string;
    transformLink?: (href: string) => string;
    getPublicPath?: (options: OptionsType, href?: string) => string;
    renderInline?: boolean;
    cache?: CacheContext;
    context?: RevisionContext;
    fs?: FsContext;
    deps?: DependencyContext;
    [x: string]: unknown;
}

export interface OutputType {
    result: {
        html: string;
    } & EnvType;
    logs: Record<LogLevels, string[]>;
}

export type EnvType<Extras extends {} = {}> = {
    title?: string;
    headings: Heading[];
    assets?: unknown[];
    meta?: object;
    changelogs?: ChangelogItem[];
} & Extras;

export interface MarkdownItPluginOpts {
    path: string;
    log: Logger;
    lang: 'ru' | 'en' | 'es' | 'fr' | 'cs' | 'ar' | 'he';
    root: string;
    rootPublicPath: string;
    isLintRun: boolean;
    cache?: CacheContext;
    context?: RevisionContext;
    fs?: FsContext;
    deps?: DependencyContext;
    conditionsInCode?: boolean;
    vars?: Record<string, string>;
    extractTitle?: boolean;
    disableLiquid?: boolean;
}

export type MarkdownItPluginCb<T extends {} = {}> = {
    // TODO: use "T extends unknown = {}"
    (md: MarkdownIt, opts: T & MarkdownItPluginOpts): void;
};

export type MarkdownItPreprocessorCb<T extends unknown = {}> = {
    (input: string, opts: T & Partial<MarkdownItPluginOpts>, md?: MarkdownIt): string;
};
