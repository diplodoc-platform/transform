import type {MarkdownItPluginCb} from './typings';
import type {MarkdownIt} from '../typings';

import {envMeta} from '../document-meta';

/**
 * Bind metadata registration to the execution host's native-context initializer.
 * @param initializeDocumentField - Canonical field initializer, with the host's fallback.
 * @returns Existing metadata callback and YAML environment writer.
 */
export function createMetaPlugin(initializeDocumentField: (md: MarkdownIt, field: 'meta') => void) {
    const meta: MarkdownItPluginCb = (md) => {
        initializeDocumentField(md, 'meta');
        envMeta(md);
    };

    return meta;
}
