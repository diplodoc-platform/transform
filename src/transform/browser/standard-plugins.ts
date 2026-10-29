import type {BuiltinPluginId} from '../plugin-ids';
import type {MarkdownIt} from '../typings';

import footnotes from '../plugins/footnotes';
import taskList from '../plugins/task-list';
import {builtinPluginIds} from '../plugin-ids';
import {initializeDocumentField} from '../document-context-core';
import {createMetaPlugin} from '../plugins/meta-core';
import deflist from '../plugins/deflist';
import cut from '../plugins/cut';
import {createNotesPlugin} from '../plugins/notes/core';
import {createAnchorsPlugin} from '../plugins/anchors/core';
import tabs from '../plugins/tabs';
import code from '../plugins/code';
import sup from '../plugins/sup';
import video from '../plugins/video';
import monospace from '../plugins/monospace';
import {createTablePlugin} from '../plugins/table/core';
import file from '../plugins/file';
import {createImsizePlugin} from '../plugins/imsize/core';
import {createTermPlugin} from '../plugins/term/core';
import {createTermDefinitions} from '../plugins/term/definitions-core';
import blockAnchor from '../plugins/block-anchor';
import inlineCode from '../plugins/inline-code';
import visibility from '../plugins/visibility';
import underline from '../plugins/underline';
import subscript from '../plugins/subscript';

import {parseDocumentFragment} from './document';
import {createBrowserReporter} from './diagnostics';

const plainPath = (path: string) => path;

// Check exhaustiveness/callability while retaining each callback's exact inferred options.
// A merged inventory change deliberately requires new real bindings.
const callbacks = {
    meta: createMetaPlugin(initializeDocumentField),
    deflist,
    cut,
    notes: createNotesPlugin(plainPath),
    anchors: createAnchorsPlugin(plainPath),
    tabs,
    code,
    sup,
    video,
    monospace,
    table: createTablePlugin(createBrowserReporter),
    file,
    imsize: createImsizePlugin(createBrowserReporter),
    term: createTermPlugin(createTermDefinitions(parseDocumentFragment)),
    'block-anchor': blockAnchor,
    'inline-code': inlineCode,
    visibility,
    underline,
    subscript,
    footnotes,
    'task-list': taskList,
} satisfies Record<BuiltinPluginId, (md: MarkdownIt, options: never) => void>;

/** Current actual builtin callbacks in the one authoritative installation order. */
export const standardPlugins = builtinPluginIds.map((id) => callbacks[id]);
