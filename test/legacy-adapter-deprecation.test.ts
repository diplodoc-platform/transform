import MarkdownIt from 'markdown-it';
import {vi} from 'vitest';
import {transform as createCut} from '@diplodoc/cut-extension';
import {transform as createTabs} from '@diplodoc/tabs-extension';

import transform from '../src/transform';
import {createDeprecationReporter} from '../src/transform/deprecation';
import {defineLegacyPlugin, defineTransformOptions} from '../src/transform/plugin-configuration';
import cut from '../src/transform/plugins/cut';
import tabs from '../src/transform/plugins/tabs';
import preset from '../src/transform/plugins';

describe('legacy extension callbacks', () => {
    const consumer = () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn()});

    test('keeps the preset identities and the cut collector', () => {
        expect(preset[2]).toBe(cut);
        expect(preset[5]).toBe(tabs);
        expect(cut.collect).toBeTypeOf('function');
    });

    test('automatic default and named builtins do not warn', () => {
        const log = consumer();
        transform('Hello', {disableLiquid: true, log});
        transform('Hello', {disableLiquid: true, log, pluginConfiguration: {}});
        expect(log.warn).not.toHaveBeenCalled();
    });

    test('explicit callbacks warn and custom delegation is not suppressed', () => {
        const log = consumer();
        transform('Hello', {disableLiquid: true, log, path: 'guide.md', plugins: [cut, tabs]});
        expect(log.warn.mock.calls.map(([message]) => message).join('\n')).toContain(
            'LEGACY_CUT_CALLBACK',
        );
        expect(log.warn.mock.calls.map(([message]) => message).join('\n')).toContain(
            'LEGACY_TABS_CALLBACK',
        );
        const delegated = defineLegacyPlugin({id: 'custom-cut', plugin: cut})({});
        transform('Hello', {disableLiquid: true, log, pluginConfiguration: {plugins: [delegated]}});
        expect(
            log.warn.mock.calls.filter(([message]) => message.includes('LEGACY_CUT_CALLBACK')),
        ).toHaveLength(2);
    });

    test('reporting is scoped and native calls remain silent', () => {
        const log = consumer();
        const reporter = createDeprecationReporter({log});
        const options = {output: '.', deprecations: reporter, path: 'guide.md'};
        cut(new MarkdownIt(), options);
        cut(new MarkdownIt(), options);
        expect(log.warn).toHaveBeenCalledTimes(1);
        const nextOptions = {
            output: '.',
            deprecations: createDeprecationReporter({log}),
            path: 'guide.md',
        };
        cut(new MarkdownIt(), nextOptions);
        expect(log.warn).toHaveBeenCalledTimes(2);
        expect(() => cut(new MarkdownIt())).not.toThrow();
    });
});

test.each(['', ' radio', ' dropdown', ' accordion'])(
    'tabs adapter preserves direct factory behavior for %s',
    (variant) => {
        const source = `{% list tabs${variant} %}\n\n- First\n\n  Body\n\n- Second\n\n  Other\n\n{% endlist %}`;
        const direct = createTabs({
            bundle: false,
            features: {
                enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true},
            },
        });
        const run = (plugin: typeof tabs) => {
            let sequence = 0;
            const generateID = vi.fn(() => `id-${++sequence}`);
            const env = {};
            const html = new MarkdownIt()
                .use(plugin, {output: '/out', generateID})
                .render(source, env);
            return {html, env, calls: generateID.mock.calls};
        };
        expect(run(tabs)).toEqual(run(direct));
    },
);

test('cut adapter preserves direct factory behavior for nested cuts', () => {
    const source = '{% cut "Outer" %}\n\n{% cut "Inner" %}\n\nBody\n\n{% endcut %}\n\n{% endcut %}';
    const direct = createCut({bundle: false, directiveSyntax: 'disabled'});
    const run = (plugin: typeof cut) => {
        const env = {};
        const html = new MarkdownIt().use(plugin, {output: '/out'}).render(source, env);
        return {html, env};
    };
    expect(run(cut)).toEqual(run(direct));
});

test.each([undefined, 'disabled', 'enabled', 'only'] as const)(
    'factory guidance preserves effective %s mode for block directives and paragraphs',
    (configuredMode) => {
        const mode = configuredMode ?? 'disabled';
        const source = [
            'Before paragraph.',
            ':::cut [Title]\n\nCut body.\n\n:::',
            ':::tabs\n\n- First\n\n  Tab body.\n\n:::',
            'After paragraph.',
        ].join('\n\n');
        const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        const directiveSyntax = configuredMode;
        const actual = transform(source, {
            disableLiquid: true,
            plugins: [cut, tabs],
            directiveSyntax,
            generateID: () => 'fixed',
            path: 'guide.md',
            log,
        });
        const expected = transform(source, {
            disableLiquid: true,
            plugins: [
                createCut({bundle: false, directiveSyntax}),
                createTabs({
                    bundle: false,
                    directiveSyntax,
                    features: {
                        enabledVariants: {
                            radio: true,
                            regular: true,
                            dropdown: true,
                            accordion: true,
                        },
                    },
                }),
            ],
            generateID: () => 'fixed',
        });
        expect(actual.result).toEqual(expected.result);
        expect(log.warn.mock.calls.map(([message]) => message)).toEqual([
            `[DEPRECATED LEGACY_CUT_CALLBACK] Transform cut callback at guide.md, option "plugins.cut". Use transform({bundle: false, directiveSyntax: '${mode}'}) from @diplodoc/cut-extension. Removal: version 6.0.0.`,
            `[DEPRECATED LEGACY_TABS_CALLBACK] Transform tabs callback at guide.md, option "plugins.tabs". Use transform({bundle: false, directiveSyntax: '${mode}', features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}}}) from @diplodoc/tabs-extension. Removal: version 6.0.0.`,
        ]);
    },
);

test('named preset customization preserves an explicit spread preset and its disabled modes', () => {
    const custom = vi.fn((md: Parameters<typeof cut>[0]) => {
        md.renderer.rules.hr = () => '<hr class="custom">\n';
    });
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    const source = 'Before\n\n:::cut [Title]\n\nBody\n\n:::\n\n---';
    const core = {disableLiquid: true, generateID: () => 'fixed', log};
    const old = transform(source, {...core, plugins: [...preset, custom]});
    expect(log.warn.mock.calls.map(([message]) => message)).toHaveLength(2);
    log.warn.mockClear();
    const configuredCustom = defineLegacyPlugin({id: 'app/custom', plugin: custom})({});
    const migrated = transform(
        source,
        defineTransformOptions({
            core,
            plugins: {
                preset: 'default',
                options: {
                    cut: {directiveSyntax: 'disabled'},
                    notes: {directiveSyntax: 'disabled'},
                    tabs: {directiveSyntax: 'disabled'},
                },
                plugins: [configuredCustom],
            },
        }),
    );
    expect(migrated.result).toEqual(old.result);
    expect(log.warn).not.toHaveBeenCalled();
    expect(custom).toHaveBeenCalledTimes(2);
});
