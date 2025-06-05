import {LanguageFn} from 'highlight.js';
import DefaultMarkdownIt, {Token} from 'markdown-it';
import DefaultStateCore from 'markdown-it/lib/rules_core/state_core';

import {SanitizeFunction, SanitizeOptions} from './sanitize';
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

export type Lang =
    | 'ru'
    | 'en'
    | 'ar'
    | 'cs'
    | 'fr'
    | 'es'
    | 'he'
    | 'bg'
    | 'et'
    | 'el'
    | 'pt'
    | 'zh'
    | 'zh-tw'
    | 'kk'
    | 'tr'
    | 'uz';

export interface OptionsType {
    tokens?: boolean;
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
    sanitize?: SanitizeFunction;
    needFlatListHeadings?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: ExtendedPluginWithCollect<any, any>[];
    highlightLangs?: HighlightLangMap;
    disableRules?: string[];
    extractChangelogs?: boolean;
    root?: string;
    rootPublicPath?: string;
    transformLink?: (href: string) => string;
    getPublicPath?: (options: OptionsType, href?: string) => string;
    renderInline?: boolean;
    cache?: CacheContext;
    // TODO: set false by default in next major
    /**
     * `markdown-it-attrs` plugin is enabled by default
     *
     * Set value to `false` to disable it
     */
    enableMarkdownAttrs?: boolean;
    supportGithubAnchors?: boolean;
    disableCommonAnchors?: boolean;
    useCommonAnchorButtons?: boolean;
    lang?: string;
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
    additionalOptionsCssWhiteList?: CssWhiteList;
} & Extras;

export interface MarkdownItPluginOpts {
    path: string;
    log: Logger;
    lang: Lang;
    root: string;
    rootPublicPath: string;
    isLintRun: boolean;
    cache?: CacheContext;
    conditionsInCode?: boolean;
    vars?: Record<string, string>;
    extractTitle?: boolean;
    disableLiquid?: boolean;
    skipLinkFileCheck?: boolean;
}

export type MarkdownItPluginCb<T extends {} = {}> = {
    // TODO: use "T extends unknown = {}"
    (md: MarkdownIt, opts: T & MarkdownItPluginOpts): void;
};

export type IntrinsicCollectOptions = {
    tokenStream: Token[];
};

export type ExtendedPluginWithCollect<
    PluginRegularOptions extends {} = {},
    PluginCollectOptions = {},
> = MarkdownItPluginCb<PluginRegularOptions> & {
    collect?: (
        input: string,
        options: PluginCollectOptions & IntrinsicCollectOptions,
    ) => string | void;
};

export type MarkdownItPreprocessorCb<T extends unknown = {}> = {
    (input: string, opts: T & Partial<MarkdownItPluginOpts>, md?: MarkdownIt): string;
};

export type CssWhiteList = {[property: string]: boolean};
