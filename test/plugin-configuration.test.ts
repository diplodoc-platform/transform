import type {ExtendedPluginWithCollect, OptionsType} from '../src/transform/typings';
import type {PluginConfiguration, PluginContext} from '../src/transform/plugin-configuration';

import {describe, expect, test, vi} from 'vitest';

import transform from '../src/transform';
import DefaultPlugins from '../src/transform/plugins';
import {
    builtinPluginIds,
    defineLegacyPlugin,
    definePlugin,
    defineTransformOptions,
} from '../src/transform/plugin-configuration';
import {resolvePluginConfiguration} from '../src/transform/plugin-registry';

const document = [
    '# Heading',
    'A paragraph with `code`, ~~a strike~~ and x^2^.',
    '{% note info %}\n\nNote body\n\n{% endnote %}',
    '![Image](image.png =40x50)',
    '#|\n|| one | two ||\n|#',
].join('\n\n');

const stableCore = {generateID: () => 'stable-id', disableLiquid: true};

describe('builtin composition', () => {
    test('treats an optional undefined settings entry as absent', () => {
        const plugins = {disable: ['notes' as const], options: {notes: undefined}};
        expect(
            transform(document, defineTransformOptions({core: stableCore, plugins})).result,
        ).toEqual(
            transform(
                document,
                defineTransformOptions({core: stableCore, plugins: {disable: ['notes']}}),
            ).result,
        );
    });
    test('preserves token-mode output through the strict builder', () => {
        const tokens = transform('text', defineTransformOptions({core: {tokens: true}}));
        expect(tokens.map(({type}) => type)).toEqual([
            'paragraph_open',
            'inline',
            'paragraph_close',
        ]);
    });
    test('explicit default preserves callback identities, order and output', () => {
        const options = defineTransformOptions({core: stableCore});
        const selected = resolvePluginConfiguration(options);

        expect(selected?.map(({id}) => id)).toEqual(builtinPluginIds);
        expect(selected?.map(({plugin}) => plugin)).toEqual(DefaultPlugins);
        expect(transform(document, options).result).toEqual(transform(document, stableCore).result);
    });

    test.each(builtinPluginIds)('disables %s without copying the default list', (id) => {
        const options = defineTransformOptions({core: stableCore, plugins: {disable: [id]}});
        const expected = DefaultPlugins.filter((_, index) => builtinPluginIds[index] !== id);

        expect(resolvePluginConfiguration(options)?.map(({plugin}) => plugin)).toEqual(expected);
        expect(transform(document, options).result).toEqual(
            transform(document, {...stableCore, plugins: expected}).result,
        );
    });

    test.each(builtinPluginIds)('enables %s in an empty feature preset', (id) => {
        const options = defineTransformOptions({
            core: stableCore,
            plugins: {preset: 'none', enable: [id]},
        });
        const expected = [DefaultPlugins[builtinPluginIds.indexOf(id)]];

        expect(resolvePluginConfiguration(options)?.map(({plugin}) => plugin)).toEqual(expected);
        expect(transform(document, options).result).toEqual(
            transform(document, {...stableCore, plugins: expected}).result,
        );
    });

    test('scopes builtin options and retains the legacy flat form', () => {
        const note = '{% note info %}\n\nBody\n\n{% endnote %}';
        const inspect = vi.fn();
        const custom = definePlugin<{}>({id: 'inspect', setup: inspect});
        const options = defineTransformOptions({
            plugins: {options: {notes: {notesAutotitle: false}}, plugins: [custom({})]},
        });

        expect(transform(note, options).result.html).not.toContain('yfm-note-title');
        expect(transform(note).result.html).toContain('yfm-note-title');
        expect(transform(note, {notesAutotitle: false}).result.html).toBe(
            transform(note, options).result.html,
        );
        expect(inspect.mock.calls[0][2]).not.toHaveProperty('notesAutotitle');
    });

    test('the empty preset retains core rules, their controls and sanitization', () => {
        const core = {allowHTML: true, linkify: true};
        const input = [
            '4. ordered',
            'paragraph{#explicit}',
            '~~https://example.com~~',
            '<!--diplodoc:svg asset.svg--><svg><title>Icon</title></svg>',
            '<script>alert(1)</script>',
        ].join('\n\n');
        const output = transform(input, defineTransformOptions({core, plugins: {preset: 'none'}}));

        expect(output.result.html).toBe(transform(input, {...core, plugins: []}).result.html);
        expect(output.result.html).toContain('--hier-list-start:3');
        expect(output.result.html).toContain('id="explicit"');
        expect(output.result.html).toContain('<s><a href="https://example.com">');
        expect(output.result.html).not.toContain('diplodoc:svg');
        expect(output.result.html).not.toContain('<script>');
        expect(
            transform(
                'paragraph{#explicit}',
                defineTransformOptions({
                    core: {enableMarkdownAttrs: false},
                    plugins: {preset: 'none'},
                }),
            ).result.html,
        ).toContain('{#explicit}');
    });
});

describe('custom configuration and compatibility', () => {
    test('separates config from truthful normalized context, including omitted paths', () => {
        const contexts: PluginContext[] = [];
        const configure = definePlugin<{label: string; log: string; path: string}>({
            id: 'custom',
            setup(md, options, context) {
                contexts.push(context);
                expect(options.log).toBe('local config');
                expect(options.path).toBe('local path');
                md.renderer.rules.text = () => options.label;
            },
        });
        const plugin = configure({label: 'custom output', log: 'local config', path: 'local path'});
        const options = defineTransformOptions({plugins: {preset: 'none', plugins: [plugin]}});

        expect(transform('text', options).result.html).toBe('<p>custom output</p>\n');
        expect(contexts[0].path).toBeUndefined();
        expect(contexts[0].root).toBeUndefined();
        expect(contexts[0].rootPublicPath).toBeUndefined();
        expect(contexts[0].isLintRun).toBeUndefined();
        expect(contexts[0].log.warn).toBeTypeOf('function');
        expect(contexts[0].deprecations.warn).toBeTypeOf('function');
        expect(contexts[0].generateID).toBeTypeOf('function');
        expect(contexts[0].lang).toBeTypeOf('string');
    });

    test('binds independent options for different custom definitions', () => {
        const calls: string[] = [];
        const first = definePlugin<{one: string}>({
            id: 'one',
            setup(_md, options) {
                calls.push(options.one);
                expect(options).not.toHaveProperty('two');
            },
        });
        const second = definePlugin<{two: string}>({
            id: 'two',
            setup(_md, options) {
                calls.push(options.two);
                expect(options).not.toHaveProperty('one');
            },
        });

        transform(
            'text',
            defineTransformOptions({
                plugins: {
                    plugins: [first({one: 'first'}), second({two: 'second'})],
                },
            }),
        );
        expect(calls).toEqual(['first', 'second']);
    });

    test('preserves legacy passthrough and collector identities in explicit adapters', () => {
        const customOption = {value: 123};
        const callback = vi.fn();
        const legacy: ExtendedPluginWithCollect<
            {customOption: typeof customOption},
            {flag: boolean}
        > = (_md, options) => callback(options);
        const collect = vi.fn((input: string) => input.toUpperCase());
        legacy.collect = collect;

        transform('text', {plugins: [legacy], customOption});
        expect(callback.mock.calls[0][0].customOption).toBe(customOption);
        expect(legacy.collect).toBe(collect);

        const adapted = defineLegacyPlugin({id: 'legacy', plugin: legacy})({customOption});
        expect(adapted.plugin.collect).toBe(collect);
        expect(adapted.plugin.collect?.('text', {flag: true, tokenStream: []})).toBe('TEXT');
        transform('text', defineTransformOptions({plugins: {plugins: [adapted]}}));
        expect(callback.mock.calls[1][0].customOption).toBe(customOption);

        const custom = definePlugin<{}, {flag: boolean}>({id: 'new', setup() {}, collect})({});
        expect(custom.plugin.collect).toBe(collect);
    });
});

describe('composition diagnostics', () => {
    const make = (id: string, ordering = {}) => definePlugin<{}>({id, ...ordering, setup() {}})({});

    test('sorts dependencies stably while retaining unconstrained order', () => {
        const configuration = {
            preset: 'none' as const,
            plugins: [make('last', {requires: ['first']}), make('middle'), make('first')],
        };
        expect(
            resolvePluginConfiguration({pluginConfiguration: configuration})?.map(({id}) => id),
        ).toEqual(['first', 'last', 'middle']);
        const explicit = {plugins: [make('before-code', {before: ['code'], after: ['tabs']})]};
        const ids =
            resolvePluginConfiguration({pluginConfiguration: explicit})?.map(({id}) => id) ?? [];
        expect(ids.indexOf('before-code')).toBeGreaterThan(ids.indexOf('tabs'));
        expect(ids.indexOf('before-code')).toBeLessThan(ids.indexOf('code'));
        expect(ids.filter((id) => id !== 'before-code')).toEqual(builtinPluginIds);
    });

    test.each([
        [{enable: ['typo']}, 'Unknown builtin plugin "typo"'],
        [{enable: ['notes'], disable: ['notes']}, 'both enabled and disabled'],
        [{preset: 'typo'}, 'Unknown plugin preset'],
        [
            {disable: ['notes'], options: {notes: {notesAutotitle: false}}},
            'unselected plugin "notes"',
        ],
        [{options: {notes: {log: 'collision'}}}, 'Unknown option "log"'],
        [{plugins: [make('same'), make('same')]}, 'Duplicate plugin ID "same"'],
        [{plugins: [make('notes')]}, 'conflicts with a builtin'],
        [
            {plugins: [make('missing', {requires: ['absent']})]},
            'requires unselected plugin "absent"',
        ],
        [{plugins: [make('missing', {before: ['absent']})]}, 'before unselected plugin "absent"'],
        [{plugins: [make('self', {after: ['self']})]}, 'self-referencing'],
        [{plugins: [make('a', {after: ['b']}), make('b', {after: ['a']})]}, 'ordering cycle'],
        [
            {plugins: [make('reorder', {requires: ['file'], before: ['meta']})]},
            'conflicts with builtin order: "meta" must be installed before "file"',
        ],
    ])('rejects invalid composition %j', (invalid, message) => {
        const effect = vi.fn();
        const configuration = invalid as PluginConfiguration;
        const plugins = [
            ...(configuration.plugins ?? []),
            definePlugin<{}>({id: 'effect', setup: effect})({}),
        ];

        expect(() => transform('text', {pluginConfiguration: {...configuration, plugins}})).toThrow(
            String(message),
        );
        expect(effect).not.toHaveBeenCalled();
    });

    test('rejects legacy composition and option collisions', () => {
        expect(() => transform('text', {plugins: [], pluginConfiguration: {}})).toThrow('not both');
        const options: OptionsType = {
            notesAutotitle: true,
            pluginConfiguration: {options: {notes: {notesAutotitle: false}}},
        };
        expect(() => transform('text', options)).toThrow('configured both flat and by ID');
    });
});
