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
import type {LegacyBuiltinOptions, PluginConfiguration} from './plugin-configuration';
import type {Highlighter} from './highlighter';
import type {DocumentMeta} from './document';
export type {
    DocumentEnv,
    DocumentMeta,
    DocumentParser,
    ParsedDocument,
    ChildParseOptions,
} from './document';
import type {SvgInlineOptions} from './plugins/images/options';
import type {ChangelogItem} from './plugins/changelog/types';
import type {IDGenerator} from './plugins/utils';
import type {VisibilityMode} from './plugins/visibility';

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

export interface OptionsType extends LegacyBuiltinOptions {
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
    /** Additive named composition; cannot be combined with the legacy plugins array. */
    pluginConfiguration?: PluginConfiguration;
    /** Preserve the existing lint context when plugins are run by a lint consumer. */
    isLintRun?: boolean;
    /** Enable the existing preprocessor for materialized include blocks (default true). */
    included?: boolean;
    preprocessors?: MarkdownItPreprocessorCb[]; // Preprocessors should modify the input before passing it to MD
    /** Explicit synchronous code highlighter; omitted means escaped plain code. */
    highlighter?: Highlighter;
    /** @deprecated Use createHighlightJsHighlighter(instance, {languages}). Removal: Transform 6. */
    highlightLangs?: HighlightLangMap;
    disableRules?: string[];
    extractChangelogs?: boolean;
    root?: string;
    rootPublicPath?: string;
    transformLink?: (href: string) => string;
    getPublicPath?: (options: OptionsType, href?: string) => string;
    renderInline?: boolean;
    cache?: CacheContext;
    /** Enable general Markdown attributes explicitly; disabled by default. */
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
     * Custom ID generator to use for this parser.
     * If provided, this exact function is used for IDs and retains its caller-owned state.
     * If not provided, Transform uses its default random ID generator.
     *
     * Parser reuse does not reset or clone a supplied generator.
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
