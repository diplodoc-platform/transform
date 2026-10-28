import type {VideoPluginOptions} from './plugins/video/types';
import type {YfmTablePluginOptions} from './plugins/table/types';
import type {VisibilityMode} from './shared-types';
import type {BuiltinPluginId} from './plugin-ids';

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

export const builtinOptionKeys: Record<BuiltinPluginId, readonly string[]> = {
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
