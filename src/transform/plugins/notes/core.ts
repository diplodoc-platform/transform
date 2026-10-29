import type {MarkdownItPluginCb} from '../typings';

import {createNotesPlugin as createStandaloneNotesPlugin} from '@diplodoc/notes-extension/plugin';

type NotesPluginParams = {
    notesAutotitle: boolean;
};

/**
 * Bind the canonical notes grammar to the current execution host.
 * @param formatPath - Original terminal or plain browser path formatting.
 * @returns The retained Transform callback with its existing settings.
 */
export function createNotesPlugin(formatPath: (path: string) => string) {
    const plugin = createStandaloneNotesPlugin(formatPath);
    const index: MarkdownItPluginCb<NotesPluginParams> = (md, options) => plugin(md, options);

    return index;
}
