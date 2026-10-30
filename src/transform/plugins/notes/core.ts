import type {MarkdownItPluginCb} from '../typings';
import type {DirectiveSyntax} from '../../plugin-settings';

import {createNotesPlugin as createStandaloneNotesPlugin} from '@diplodoc/notes-extension/plugin';

import {directiveMode, reportDirectiveDiagnostic, unwrapBuiltin} from '../../builtin-invocation';

type NotesPluginParams = {
    notesAutotitle: boolean;
    directiveSyntax?: DirectiveSyntax;
};

/**
 * Bind the canonical notes grammar to the current execution host.
 * @param formatPath - Original terminal or plain browser path formatting.
 * @returns The retained Transform callback with its existing settings.
 */
export function createNotesPlugin(formatPath: (path: string) => string) {
    const plugin = createStandaloneNotesPlugin(formatPath);
    const index: MarkdownItPluginCb<NotesPluginParams> = (md, options) => {
        const invocation = unwrapBuiltin(options, index);
        const mode = directiveMode(invocation.options?.directiveSyntax, invocation.automatic);
        if (mode === 'disabled') {
            plugin(md, invocation.options);
        } else {
            createStandaloneNotesPlugin(formatPath, undefined, {
                directiveSyntax: mode,
                onDiagnostic: (item) =>
                    reportDirectiveDiagnostic(md, invocation.options, 'note', item),
            })(md, invocation.options);
        }
    };

    return index;
}
