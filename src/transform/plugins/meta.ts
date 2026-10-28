import type {MarkdownItPluginCb} from './typings';

import {initializeDocumentField} from '../document-context';
import {envMeta} from '../document-meta';

const meta: MarkdownItPluginCb = (md) => {
    initializeDocumentField(md, 'meta');
    envMeta(md);
};

export default meta;
