import type {PluginContext} from '../src/transform/plugin-configuration';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};

import transform from '../src/transform';
import {definePlugin, defineTransformOptions} from '../src/transform/plugin-configuration';

/**
 * Compiled by typecheck; never executed as a runtime test.
 * @param context - The public plugin context contract.
 * @returns Values used to check optional context fields.
 */
export function configurationTypeFixtures(context: PluginContext) {
    const tokens: Token[] = transform('text', defineTransformOptions({core: {tokens: true}}));
    const html: string = transform('text', defineTransformOptions()).result.html;
    defineTransformOptions({core: {allowHTML: true, isLintRun: false, included: false}});
    defineTransformOptions({
        plugins: {
            enable: ['notes'],
            options: {
                notes: {notesAutotitle: false},
                imsize: {enableInlineStyling: true},
                term: {multilineTermDefinitions: true},
                file: {fileExtraAttrs: [['data-kind', 'attachment']], output: 'build'},
                table: {
                    table_ignoreSplittersInInlineCode: true,
                    table_ignoreSplittersInBlockMath: false,
                },
                video: {
                    youtube: {width: 300, height: 200},
                    vine: {width: 300, height: 200, embed: 'simple'},
                },
            },
        },
    });

    // @ts-expect-error Core settings do not accept arbitrary keys.
    defineTransformOptions({core: {allowHTLM: true}});
    // @ts-expect-error Builtin option settings belong in their own namespace.
    defineTransformOptions({core: {notesAutotitle: false}});
    // @ts-expect-error Builtin IDs are finite.
    defineTransformOptions({plugins: {disable: ['note']}});
    // @ts-expect-error Settings use their actual option value types.
    defineTransformOptions({plugins: {options: {notes: {notesAutotitle: 'false'}}}});
    // @ts-expect-error Settings cannot overwrite shared core context.
    defineTransformOptions({plugins: {options: {notes: {log: context.log}}}});
    // @ts-expect-error A no-settings builtin does not accept arbitrary keys.
    defineTransformOptions({plugins: {options: {meta: {arbitrary: true}}}});
    // @ts-expect-error Ordinary transform calls do not guarantee a source path.
    const path: string = context.path;
    // @ts-expect-error Context root can also be omitted.
    const root: string = context.root;

    const custom = definePlugin<{label: string}>({
        id: 'custom',
        setup(_md, options, shared) {
            options.label.toUpperCase();
            shared.deprecations.compatibility('EXAMPLE');
            // @ts-expect-error Another plugin's options are not available here.
            String(options.other);
            // @ts-expect-error Core context is not custom configuration.
            String(options.log);
        },
    });
    custom({label: 'valid'});
    // @ts-expect-error Custom option values are checked.
    custom({label: false});
    // @ts-expect-error Custom option names are checked.
    custom({label: 'valid', other: true});
    // @ts-expect-error Custom required options cannot be omitted.
    custom({});

    return {path, root, tokens, html};
}
