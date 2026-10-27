import type {LanguageFn} from 'highlight.js';
import type {
    MarkdownIt as DefaultMarkdownIt,
    StateBlock as DefaultStateBlock,
    StateCore as DefaultStateCore,
    StateInline as DefaultStateInline,
    Env,
    Token,
} from 'markdown-it' with {'resolution-mode': 'import'};
import type {SanitizeFunction, SanitizeOptions} from './sanitize';
import type {LogConsumer, LogLevels, Logger} from './log';
import type {CompatibilityPolicy, DeprecationReporter} from './deprecation';
import type {SvgInlineOptions} from './plugins/images/options';
import type {ChangelogItem} from './plugins/changelog/types';
import type {IDGenerator} from './plugins/utils';
import type {VisibilityMode} from './plugins/visibility';

export interface MarkdownIt extends DefaultMarkdownIt {
    assets?: string[];
    meta?: string[];
}

export interface StateCore extends DefaultStateCore {
    md: MarkdownIt;
    env: ParserEnv;
}

export interface ParserEnv extends Env {
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
    /** Forward plugin messages while retaining the collected Transform diagnostics. */
    log?: LogConsumer;
    /** Explicit per-feature migration choices; unspecified features use their current contract. */
    compatibility?: CompatibilityPolicy;
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
    lang?: Lang;
    [x: string]: unknown;
    /** Override SVGO's XML entity limit for SVG inlining. Omit to use its default. */
    svgMaxEntityCount?: number;
    /** @deprecated Use svgInline.enabled. Scheduled for removal in Transform 6. */
    inlineSvg?: boolean;
    svgInline?: SvgInlineOptions;
    rawContent?: (path: string, assets: Record<string, string | boolean>) => string | boolean;
    calcPath?: (root: string, path: string) => string;
    replaceImageSrc?: (
        state: StateCore,
        currentPath: string,
        path: string,
        imgSrc: string,
        opts: unknown,
    ) => string;
    /**
     * Show button to toggle line wrapping of code.
     * @type {boolean}
     * @default false
     */
    codeLineWrapping?: boolean;
    /**
     * Selects audience-specific content. Defaults to `human`.
     */
    contentAudience?: VisibilityMode;
    /**
     * Custom ID generator factory to use for this transform call.
     * If provided, it will be called once per file to create a per-file isolated generator.
     * If not provided, a new {@link IDGenerator} is created via {@link createIDGenerator}
     * (deterministic per-file counters).
     *
     * Pass `() => () => Math.random().toString(36).substr(2, 8)` to restore legacy random behavior.
     */
    generateID?: IDGenerator;
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
