import type {
    ExtendedPluginWithCollect,
    IntrinsicCollectOptions,
    MarkdownIt,
    MarkdownItPluginCb,
    MarkdownItPluginOpts,
} from './shared-types';
import type {DeprecationReporter} from './deprecation-core';
import type {IDGenerator} from '@diplodoc/utils';
import type {BuiltinPluginId} from './plugin-ids';
import type {BuiltinPluginSettings} from './plugin-settings';

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

/** A selected installation retains the original callback unless its own options need binding. */
export interface PluginInstallation {
    id: string;
    plugin: MarkdownItPluginCb;
    options?: Record<string, unknown>;
}
