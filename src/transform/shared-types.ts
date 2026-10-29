import type {
    MarkdownIt as DefaultMarkdownIt,
    StateBlock as DefaultStateBlock,
    StateCore as DefaultStateCore,
    StateInline as DefaultStateInline,
    Env,
    Token,
} from 'markdown-it' with {'resolution-mode': 'import'};
import type {IDGenerator} from '@diplodoc/utils';
import type {LogConsumer, Logger} from './log-core';
import type {CompatibilityPolicy, DeprecationReporter} from './deprecation-core';
import type {SvgInlineOptions} from './plugins/images/options';
import type {ChangelogItem} from './plugins/changelog/types';

export type ContentAudience = 'human' | 'agent';
export type VisibilityMode = ContentAudience | 'preserve';

export interface MarkdownIt extends DefaultMarkdownIt {
    assets?: string[];
    meta?: DocumentMeta;
    included?: Record<string, string>;
}

export interface StateCore extends DefaultStateCore {
    md: MarkdownIt;
    env: ParserEnv;
}

export interface ParserEnv extends Env {
    meta?: DocumentMeta;
    assets?: string[];
    included?: Record<string, string>;
    path?: string;
    includes?: string[];
    terms?: Record<string, string>;
    changelogs?: ChangelogItem[];
    additionalOptionsCssWhiteList?: CssWhiteList;
}

export interface StateInline extends DefaultStateInline {
    env: ParserEnv;
}

export interface StateBlock extends DefaultStateBlock {
    env: ParserEnv;
}

export interface CacheContext {
    get(key: string): string | null | undefined;
    set(key: string, value: string | null | undefined): void;
}

/**
 * Opaque registration callback forwarded to the installed optional highlighter.
 * Annotate callbacks with that library's LanguageFn to access its API; Transform
 * does not invoke callbacks or promise a particular highlighter API version.
 */
export type HighlightLanguageFactory = (highlighter: never) => object;

export type HighlightLangMap = Record<string, HighlightLanguageFactory>;

export type Heading = {
    title: string;
    href: string;
    level: number;
    items?: Heading[];
};

/** Languages supported by the existing Transform rendering contracts. */
export const supportedLanguages = [
    'ru',
    'en',
    'ar',
    'cs',
    'fr',
    'es',
    'he',
    'bg',
    'et',
    'el',
    'pt',
    'zh',
    'zh-tw',
    'kk',
    'tr',
    'uz',
] as const;

export type Lang = (typeof supportedLanguages)[number];

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
    /** Optional destination directory forwarded to plugins that bundle runtime assets. */
    output?: string;
    log: Logger;
    /** Provided by Transform; optional for callers constructing plugin options themselves. */
    deprecations?: DeprecationReporter;
    compatibility?: CompatibilityPolicy;
    lang: Lang;
    root: string;
    rootPublicPath: string;
    isLintRun: boolean;
    generateID?: IDGenerator;
    cache?: CacheContext;
    conditionsInCode?: boolean;
    vars?: Record<string, string>;
    extractTitle?: boolean;
    disableLiquid?: boolean;
    skipLinkFileCheck?: boolean;
    /** Override SVGO's XML entity limit for SVG inlining. Omit to use its default. */
    svgMaxEntityCount?: number;
    /** @deprecated Use svgInline.enabled. Scheduled for removal in Transform 6. */
    inlineSvg?: boolean;
    svgInline?: SvgInlineOptions;
    /**
     * When true, term definitions continue past blank lines until the next
     * `[*key]:` or end of block. Designed for documents where all term
     * definitions are placed at the end of the file.
     *
     * When false (default), a blank line terminates the definition unless
     * the next non-blank line is an `{% include %}` directive.
     */
    multilineTermDefinitions?: boolean;
    contentAudience?: VisibilityMode;
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

export type ImageOptions = {
    /** Diagnostic identity of the SVG asset. */
    path?: string;
    log?: LogConsumer;
    /** Override SVGO's XML entity limit for this SVG. Omit to use its default. */
    svgMaxEntityCount?: number;
    width: string | undefined | null;
    height: string | undefined | null;
    title: string | undefined | null;
    dataAttrs?: Record<string, string>;
};

export interface DocumentMeta {
    [name: string]: unknown;
    script?: string[];
    style?: string[];
    csp?: Record<string, string[]>[];
}

export interface DocumentEnv extends ParserEnv {
    title: string;
    headings: Heading[];
    meta?: DocumentMeta;
    assets?: string[];
    included?: Record<string, string>;
}

export interface ParsedDocument {
    readonly tokens: Token[];
    readonly env: DocumentEnv;
}

declare const fragmentBrand: unique symbol;

/** An in-process fragment owned by the configured parser that created it. */
export interface ParsedDocumentFragment {
    readonly tokens: Token[];
    readonly [fragmentBrand]: true;
}

export interface DocumentParser {
    parseDocument(input: string, initialize?: (env: DocumentEnv) => void): ParsedDocument;
    compileDocument(document: ParsedDocument): string;
    parse(input: string): Token[];
    compile(tokens: Token[], document?: ParsedDocument): string;
    readonly env: EnvType;
}

export interface ChildParseOptions {
    purpose: 'include' | 'reference' | 'fragment';
    path?: string;
    disableTitleRefSubstitution?: boolean;
    disableCircularError?: boolean;
}
