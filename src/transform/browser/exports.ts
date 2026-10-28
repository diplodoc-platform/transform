export {
    materializeFootnoteTokens,
    createDocumentEnv,
    envMeta,
    parseDocumentFragment,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from './document';
export {createHighlightJsHighlighter} from '../highlighter';
export {definePlugin, defineLegacyPlugin} from '../plugin-core';
export {BrowserUnsupportedFeatureError} from './errors';
export type {BrowserUnsupportedFeature, BrowserSourceLocation} from './errors';
export type {
    BrowserTransformOptions,
    BrowserPluginConfiguration,
    BrowserBuiltinSettings,
    BrowserSanitizeOptions,
    BrowserOutput,
} from './types';
export type {
    DocumentEnv,
    DocumentMeta,
    DocumentParser,
    ParsedDocument,
    ParsedDocumentFragment,
    ChildParseOptions,
    ParserEnv,
    MarkdownIt,
    StateCore,
    StateInline,
    StateBlock,
    MarkdownItPluginCb,
    Lang,
} from '../shared-types';
export type {
    PluginDefinition,
    ConfiguredPlugin,
    PluginContext,
    PluginOrdering,
} from '../plugin-core';
export type {BuiltinPluginId} from '../plugin-ids';
export type {
    Highlighter,
    HighlightResult,
    HighlightJsApi,
    HighlightJsOptions,
} from '../highlighter';
export type {IDGenerator} from '@diplodoc/utils';
export type {LogConsumer, Logger} from '../log-core';
export type {CompatibilityPolicy, DeprecationReporter} from '../deprecation-core';
