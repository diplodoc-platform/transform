import type {
    ExtendedPluginWithCollect,
    IntrinsicCollectOptions,
    MarkdownIt,
    MarkdownItPluginCb,
    MarkdownItPluginOpts,
    OptionsType,
} from './typings';
import type {DeprecationReporter} from './deprecation';
import type {IDGenerator} from './plugins/utils';
import type {VideoPluginOptions} from './plugins/video/types';
import type {YfmTablePluginOptions} from './plugins/table/types';
import type {VisibilityMode} from './plugins/visibility';

/** Stable IDs retain the historical prefix, followed by additive standard features. */
export const builtinPluginIds = Object.freeze([
    'meta',
    'deflist',
    'cut',
    'notes',
    'anchors',
    'tabs',
    'code',
    'sup',
    'video',
    'monospace',
    'table',
    'file',
    'imsize',
    'term',
    'block-anchor',
    'inline-code',
    'visibility',
    'underline',
    'subscript',
] as const);

export type BuiltinPluginId = (typeof builtinPluginIds)[number];

type NoPluginOptions = Record<string, never>;

/** Options are scoped to the selected builtin, rather than shared with every plugin. */
export interface BuiltinPluginSettings {
    meta?: NoPluginOptions;
    deflist?: NoPluginOptions;
    cut?: {output?: string};
    notes?: {notesAutotitle?: boolean};
    anchors?: {
        supportGithubAnchors?: boolean;
        disableCommonAnchors?: boolean;
        useCommonAnchorButtons?: boolean;
    };
    tabs?: {output?: string};
    code?: {codeLineWrapping?: boolean};
    sup?: NoPluginOptions;
    video?: VideoPluginOptions;
    monospace?: NoPluginOptions;
    table?: YfmTablePluginOptions;
    file?: {output?: string; fileExtraAttrs?: [string, string][]};
    imsize?: {enableInlineStyling?: boolean};
    term?: {multilineTermDefinitions?: boolean};
    'block-anchor'?: NoPluginOptions;
    'inline-code'?: NoPluginOptions;
    visibility?: {contentAudience?: VisibilityMode};
    underline?: NoPluginOptions;
    subscript?: NoPluginOptions;
}

/** Previously unnamed flat options stay available to legacy callers. */
export interface LegacyBuiltinOptions extends VideoPluginOptions, YfmTablePluginOptions {
    notesAutotitle?: boolean;
    output?: string;
    fileExtraAttrs?: [string, string][];
    enableInlineStyling?: boolean;
    multilineTermDefinitions?: boolean;
}

/** Only normalized values are required; an ordinary transform call can omit paths. */
export type PluginContext = Readonly<
    Omit<
        MarkdownItPluginOpts,
        'path' | 'root' | 'rootPublicPath' | 'isLintRun' | 'deprecations' | 'generateID'
    > & {
        path?: string;
        root?: string;
        rootPublicPath?: string;
        isLintRun?: boolean;
        deprecations: DeprecationReporter;
        generateID: IDGenerator;
    }
>;

export interface PluginOrdering {
    /** Selected dependencies must be installed before this plugin. */
    requires?: readonly string[];
    /** Ordering targets must be selected; these constraints concern installation only. */
    before?: readonly string[];
    after?: readonly string[];
}

export interface PluginDefinition<Configuration, CollectOptions = never> extends PluginOrdering {
    id: string;
    setup(md: MarkdownIt, options: Configuration, context: PluginContext): void;
    /** Collection has a separate contract and is never run by transform itself. */
    collect?: (input: string, options: CollectOptions & IntrinsicCollectOptions) => string | void;
}

export interface ConfiguredPlugin<CollectOptions = never> extends PluginOrdering {
    readonly id: string;
    readonly plugin: ExtendedPluginWithCollect<{}, CollectOptions>;
}

/**
 * Bind typed custom options without merging them into the shared parser context.
 * @param definition - Stable identity, installation callback and optional collection/ordering.
 * @returns A typed configuration function retaining the collector's original signature.
 */
export function definePlugin<Configuration, CollectOptions = never>(
    definition: PluginDefinition<Configuration, CollectOptions>,
): (options: Configuration) => ConfiguredPlugin<CollectOptions> {
    return (options) => {
        const plugin: ExtendedPluginWithCollect<{}, CollectOptions> = (md, context) => {
            definition.setup(md, options, context as PluginContext);
        };

        if (definition.collect) {
            plugin.collect = definition.collect;
        }

        return {
            id: definition.id,
            requires: definition.requires,
            before: definition.before,
            after: definition.after,
            plugin,
        };
    };
}

/**
 * Adapt an existing callback while preserving its collector and protecting core context.
 * @param definition - Existing callback, stable identity and optional ordering.
 * @returns A configuration function that retains the original collector reference.
 */
export function defineLegacyPlugin<Configuration extends {}, CollectOptions = never>(
    definition: PluginOrdering & {
        id: string;
        plugin: ExtendedPluginWithCollect<Configuration, CollectOptions>;
    },
): (options: Configuration) => ConfiguredPlugin<CollectOptions> {
    return definePlugin<Configuration, CollectOptions>({
        ...definition,
        setup(md, options, context) {
            definition.plugin(md, {...options, ...context} as Configuration & MarkdownItPluginOpts);
        },
        collect: definition.plugin.collect,
    });
}

export interface PluginConfiguration {
    /** none removes the default feature plugins, not core parsing, preprocessing or sanitization. */
    preset?: 'default' | 'none';
    enable?: readonly BuiltinPluginId[];
    disable?: readonly BuiltinPluginId[];
    options?: BuiltinPluginSettings;
    plugins?: readonly ConfiguredPlugin[];
}

type NamedOptions = {
    [Key in keyof OptionsType as string extends Key ? never : Key]: OptionsType[Key];
};

type BuiltinOptionKey =
    | keyof LegacyBuiltinOptions
    | 'supportGithubAnchors'
    | 'disableCommonAnchors'
    | 'useCommonAnchorButtons'
    | 'codeLineWrapping'
    | 'contentAudience';

/** Closed core settings; builtin-specific configuration lives under plugins.options. */
export type TransformCoreOptions = Omit<
    NamedOptions,
    BuiltinOptionKey | 'plugins' | 'pluginConfiguration'
>;

export interface TransformConfiguration {
    core?: TransformCoreOptions;
    plugins?: PluginConfiguration;
}

/**
 * Create options for the existing synchronous transform API through a closed typed contract.
 * @param configuration - Core options and independent plugin configuration.
 * @returns Options accepted by the existing synchronous transform entrypoint.
 */
export function defineTransformOptions(
    configuration: TransformConfiguration & {core: TransformCoreOptions & {tokens: true}},
): OptionsType & {tokens: true};
export function defineTransformOptions(configuration?: TransformConfiguration): OptionsType;
export function defineTransformOptions(configuration: TransformConfiguration = {}): OptionsType {
    return {...configuration.core, pluginConfiguration: configuration.plugins ?? {}};
}

/** A selected installation retains the original callback unless its own options need binding. */
export interface PluginInstallation {
    id: string;
    plugin: MarkdownItPluginCb;
    options?: Record<string, unknown>;
}
