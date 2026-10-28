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
    'footnotes',
    'task-list',
] as const);

export type BuiltinPluginId = (typeof builtinPluginIds)[number];
