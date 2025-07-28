import type {MarkdownItPluginCb} from './plugins/typings';

import meta from './plugins/meta';
import deflist from './plugins/deflist';
import cut from './plugins/cut';
import notes from './plugins/notes';
import anchors from './plugins/anchors';
import tabs from './plugins/tabs';
import code from './plugins/code';
import sup from './plugins/sup';
import video from './plugins/video';
import monospace from './plugins/monospace';
import yfmTable from './plugins/table';
import file from './plugins/file';
import imsize from './plugins/imsize';
import term from './plugins/term';
import blockAnchor from './plugins/block-anchor';

const defaultPlugins = [
    meta,
    deflist,
    cut,
    notes,
    anchors,
    tabs,
    code,
    sup,
    video,
    monospace,
    yfmTable,
    file,
    imsize,
    term,
    blockAnchor,
] as MarkdownItPluginCb[];

export = defaultPlugins;
