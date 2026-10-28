import type {OptionsType} from './typings';
import type {BuiltinPluginId, PluginInstallation, PluginOrdering} from './plugin-configuration';

import {builtinPluginIds} from './plugin-configuration';

const builtinOptions: Record<BuiltinPluginId, readonly string[]> = {
    meta: [],
    deflist: [],
    cut: ['output'],
    notes: ['notesAutotitle'],
    anchors: ['supportGithubAnchors', 'disableCommonAnchors', 'useCommonAnchorButtons'],
    tabs: ['output'],
    code: ['codeLineWrapping'],
    sup: [],
    video: [
        'videoUrl',
        'youtube',
        'vimeo',
        'vine',
        'prezi',
        'osf',
        'yandex',
        'vk',
        'rutube',
        'url',
    ],
    monospace: [],
    table: [
        'table_ignoreSplittersInBlockCode',
        'table_ignoreSplittersInInlineCode',
        'table_ignoreSplittersInBlockMath',
        'table_ignoreSplittersInInlineMath',
    ],
    file: ['output', 'fileExtraAttrs'],
    imsize: ['enableInlineStyling'],
    term: ['multilineTermDefinitions'],
    'block-anchor': [],
    'inline-code': [],
    visibility: ['contentAudience'],
    underline: [],
    subscript: [],
};

function requireBuiltin(id: string): asserts id is BuiltinPluginId {
    if (!Object.prototype.hasOwnProperty.call(builtinOptions, id)) {
        throw new Error(`Unknown builtin plugin "${id}"`);
    }
}

type OrderedPlugin = PluginInstallation & PluginOrdering;

function sortPlugins(plugins: OrderedPlugin[]): PluginInstallation[] {
    const byId = new Map<string, OrderedPlugin>();

    for (const plugin of plugins) {
        if (typeof plugin.id !== 'string' || !plugin.id.trim()) {
            throw new Error('Plugin ID must be a nonempty string');
        }
        if (typeof plugin.plugin !== 'function') {
            throw new Error(`Plugin "${plugin.id}" must provide an installation callback`);
        }
        if (byId.has(plugin.id)) {
            throw new Error(`Duplicate plugin ID "${plugin.id}"`);
        }
        byId.set(plugin.id, plugin);
    }

    const predecessors = new Map(plugins.map(({id}) => [id, new Set<string>()]));

    for (const plugin of plugins) {
        for (const kind of ['requires', 'before', 'after'] as const) {
            for (const target of plugin[kind] ?? []) {
                if (!byId.has(target)) {
                    throw new Error(`Plugin "${plugin.id}" ${kind} unselected plugin "${target}"`);
                }
                if (target === plugin.id) {
                    throw new Error(
                        `Plugin "${plugin.id}" has a self-referencing ${kind} constraint`,
                    );
                }

                const before = kind === 'before' ? plugin.id : target;
                const after = kind === 'before' ? target : plugin.id;
                predecessors.get(after)?.add(before);
            }
        }
    }

    const result: PluginInstallation[] = [];
    const installed = new Set<string>();
    const visiting: string[] = [];

    const visit = (plugin: OrderedPlugin) => {
        if (installed.has(plugin.id)) {
            return;
        }
        if (visiting.includes(plugin.id)) {
            throw new Error(`Plugin ordering cycle: ${[...visiting, plugin.id].join(' -> ')}`);
        }

        visiting.push(plugin.id);
        // Insert prerequisites at the dependent's position rather than moving unrelated builtins ahead.
        for (const dependency of plugins) {
            if (predecessors.get(plugin.id)?.has(dependency.id)) {
                visit(dependency);
            }
        }
        visiting.pop();
        installed.add(plugin.id);
        result.push(plugin);
    };

    plugins.forEach(visit);

    let previous: BuiltinPluginId | undefined;
    for (const {id} of result) {
        if (!Object.prototype.hasOwnProperty.call(builtinOptions, id)) {
            continue;
        }
        const builtin = id as BuiltinPluginId;
        if (previous && builtinPluginIds.indexOf(builtin) < builtinPluginIds.indexOf(previous)) {
            throw new Error(
                `Plugin ordering conflicts with builtin order: "${builtin}" must be installed before "${previous}"`,
            );
        }
        previous = builtin;
    }

    return result;
}

function resolveBuiltinSettings(
    options: OptionsType,
    selected: Set<BuiltinPluginId>,
): Map<BuiltinPluginId, Record<string, unknown>> {
    const settings = new Map<BuiltinPluginId, Record<string, unknown>>();

    for (const [id, value] of Object.entries(options.pluginConfiguration?.options ?? {})) {
        requireBuiltin(id);
        if (value === undefined) {
            continue;
        }
        if (!selected.has(id)) {
            throw new Error(`Options supplied for unselected plugin "${id}"`);
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`Options for plugin "${id}" must be an object`);
        }
        for (const key of Object.keys(value)) {
            if (!builtinOptions[id].includes(key)) {
                throw new Error(`Unknown option "${key}" for plugin "${id}"`);
            }
            if (Object.prototype.hasOwnProperty.call(options, key)) {
                throw new Error(`Plugin "${id}" option "${key}" is configured both flat and by ID`);
            }
        }
        settings.set(id, value);
    }

    return settings;
}

/**
 * Resolve and validate named composition before any feature plugin is installed.
 * @param options - Current transform options, including the additive configuration.
 * @param defaultPlugins - Host callbacks in the established builtin order.
 * @returns Selected installations, or undefined to retain the legacy callback path.
 */
export function resolvePluginConfiguration(
    options: OptionsType,
    defaultPlugins: NonNullable<OptionsType['plugins']>,
): PluginInstallation[] | undefined {
    const configuration = options.pluginConfiguration;
    if (configuration === undefined) {
        return undefined;
    }
    if (options.plugins !== undefined) {
        throw new Error('Use either plugins or pluginConfiguration, not both');
    }

    const preset = configuration.preset ?? 'default';
    if (preset !== 'default' && preset !== 'none') {
        throw new Error(`Unknown plugin preset "${preset}"`);
    }

    const enabled = new Set(configuration.enable ?? []);
    const disabled = new Set(configuration.disable ?? []);

    for (const id of [...enabled, ...disabled]) {
        requireBuiltin(id);
        if (enabled.has(id) && disabled.has(id)) {
            throw new Error(`Plugin "${id}" is both enabled and disabled`);
        }
    }

    const selected = new Set(
        builtinPluginIds.filter(
            (id) => (preset === 'default' || enabled.has(id)) && !disabled.has(id),
        ),
    );
    const settings = resolveBuiltinSettings(options, selected);

    const plugins: OrderedPlugin[] = builtinPluginIds.flatMap((id, index) =>
        selected.has(id) ? [{id, plugin: defaultPlugins[index], options: settings.get(id)}] : [],
    );

    for (const plugin of configuration.plugins ?? []) {
        if (Object.prototype.hasOwnProperty.call(builtinOptions, plugin.id)) {
            throw new Error(`Custom plugin ID "${plugin.id}" conflicts with a builtin plugin`);
        }
        plugins.push(plugin);
    }

    return sortPlugins(plugins);
}
