import type {SanitizeFunction, SanitizeOptions} from './sanitize';
import type {LogLevels} from './log';
import type {LegacyBuiltinOptions, PluginConfiguration} from './plugin-configuration';
import type {SvgInlineOptions} from './plugins/images/options';
import type {
    CacheContext,
    EnvType,
    ExtendedPluginWithCollect,
    HighlightLangMap,
    MarkdownItPreprocessorCb,
    StateCore,
    VisibilityMode,
} from './shared-types';
import type {CoreParserOptions} from './parser-options';

export type {
    MarkdownIt,
    StateCore,
    ParserEnv,
    StateInline,
    StateBlock,
    CacheContext,
    HighlightLanguageFactory,
    HighlightLangMap,
    Heading,
    Lang,
    EnvType,
    MarkdownItPluginOpts,
    MarkdownItPluginCb,
    IntrinsicCollectOptions,
    ExtendedPluginWithCollect,
    MarkdownItPreprocessorCb,
    CssWhiteList,
    ImageOptions,
    DocumentEnv,
    DocumentMeta,
    DocumentParser,
    ParsedDocument,
    ChildParseOptions,
} from './shared-types';

export interface OptionsType extends CoreParserOptions, LegacyBuiltinOptions {
    tokens?: boolean;
    vars?: Record<string, string>;
    path?: string;
    /** Optional destination directory forwarded to plugins that bundle runtime assets. */
    output?: string;
    conditionsInCode?: boolean;
    disableLiquid?: boolean;
    isLiquided?: boolean;
    needToSanitizeHtml?: boolean;
    sanitizeOptions?: SanitizeOptions;
    sanitize?: SanitizeFunction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: ExtendedPluginWithCollect<any, any>[];
    /** Additive named composition; cannot be combined with the legacy plugins array. */
    pluginConfiguration?: PluginConfiguration;
    /** Preserve the existing lint context when plugins are run by a lint consumer. */
    isLintRun?: boolean;
    /** Enable the existing preprocessor for materialized include blocks (default true). */
    included?: boolean;
    preprocessors?: MarkdownItPreprocessorCb[]; // Preprocessors should modify the input before passing it to MD
    /** @deprecated Use createHighlightJsHighlighter(instance, {languages}). Removal: Transform 6. */
    highlightLangs?: HighlightLangMap;
    extractChangelogs?: boolean;
    root?: string;
    rootPublicPath?: string;
    transformLink?: (href: string) => string;
    getPublicPath?: (options: OptionsType, href?: string) => string;
    cache?: CacheContext;
    supportGithubAnchors?: boolean;
    disableCommonAnchors?: boolean;
    useCommonAnchorButtons?: boolean;
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
}

export interface OutputType {
    result: {
        html: string;
    } & EnvType;
    logs: Record<LogLevels, string[]>;
}
