import type {PluginConfiguration} from '../src/transform/plugin-configuration';

import {describe, expect, it, vi} from 'vitest';

import transform from '../src/transform';
import {
    builtinPluginIds,
    definePlugin,
    defineTransformOptions,
} from '../src/transform/plugin-configuration';
import DefaultPlugins from '../src/transform/plugins';
import subscript from '../src/transform/plugins/subscript';
import underline from '../src/transform/plugins/underline';
import {resolvePluginConfiguration} from '../src/transform/plugin-registry';

const historicalIds = [
    'meta',
    'deflist',
    'cut',
    'notes',
    'anchors',
    'tabs',
    'code',
    'sup',
    'video',
    'monospace',
    'table',
    'file',
    'imsize',
    'term',
    'block-anchor',
    'inline-code',
    'visibility',
];
const source = '++**bold** and _em_++ H~2~O ~~strike~~ x^2^';
const rendered =
    '<p><u><strong>bold</strong> and <em>em</em></u> H<sub>2</sub>O <s>strike</s> x<sup>2</sup></p>\n';

describe('standard underline and subscript composition', () => {
    it('appends two stable callbacks to the unchanged historical prefix', () => {
        expect(builtinPluginIds).toEqual([...historicalIds, 'underline', 'subscript']);
        expect(DefaultPlugins).toHaveLength(19);
        expect(DefaultPlugins.slice(17)).toEqual([underline, subscript]);
        expect(
            resolvePluginConfiguration({pluginConfiguration: {}})?.map(({plugin}) => plugin),
        ).toEqual(DefaultPlugins);
    });

    it.each([false, true])(
        'enables both features by default with attrs=%s',
        (enableMarkdownAttrs) => {
            for (const pluginConfiguration of [undefined, {}, {preset: 'default'}] as const) {
                expect(
                    transform(source, {enableMarkdownAttrs, pluginConfiguration}).result.html,
                ).toBe(rendered);
            }
        },
    );

    it.each([false, true])(
        'independently disables each feature with attrs=%s',
        (enableMarkdownAttrs) => {
            const core = {enableMarkdownAttrs, linkify: true};
            expect(
                transform('++https://example.com++ H~2~O', {
                    ...core,
                    pluginConfiguration: {disable: ['underline']},
                }).result.html,
            ).toBe('<p>++https://example.com++ H<sub>2</sub>O</p>\n');
            expect(
                transform('++https://example.com++ H~2~O', {
                    ...core,
                    pluginConfiguration: {disable: ['subscript']},
                }).result.html,
            ).toBe('<p><u><a href="https://example.com">https://example.com</a></u> H~2~O</p>\n');
        },
    );

    it.each([false, true])(
        'supports none and one-feature presets with attrs=%s',
        (enableMarkdownAttrs) => {
            for (const [enable, html] of [
                [[], '<p>++x++ H~2~O</p>\n'],
                [['underline'], '<p><u>x</u> H~2~O</p>\n'],
                [['subscript'], '<p>++x++ H<sub>2</sub>O</p>\n'],
                [['underline', 'subscript'], '<p><u>x</u> H<sub>2</sub>O</p>\n'],
            ] as const) {
                expect(
                    transform('++x++ H~2~O', {
                        enableMarkdownAttrs,
                        pluginConfiguration: {preset: 'none', enable},
                    }).result.html,
                ).toBe(html);
            }
        },
    );

    it('accepts closed empty feature options', () => {
        expect(
            transform(
                source,
                defineTransformOptions({plugins: {options: {underline: {}, subscript: {}}}}),
            ).result.html,
        ).toBe(rendered);
    });

    it.each([
        [{options: {underline: {tag: 'ins'}}}, 'Unknown option "tag" for plugin "underline"'],
        [
            {options: {subscript: {parseInline: true}}},
            'Unknown option "parseInline" for plugin "subscript"',
        ],
        [{disable: ['underline'], options: {underline: {}}}, 'unselected plugin "underline"'],
        [{preset: 'none', options: {subscript: {}}}, 'unselected plugin "subscript"'],
        [{options: {underline: true}}, 'must be an object'],
        [{options: {subscript: []}}, 'must be an object'],
    ])('rejects invalid feature options before custom installation: %j', (invalid, message) => {
        const install = vi.fn();
        const effect = definePlugin<{}>({id: 'effect', setup: install})({});
        const pluginConfiguration = {...invalid, plugins: [effect]} as PluginConfiguration;
        expect(() => transform(source, {pluginConfiguration})).toThrow(message);
        expect(install).not.toHaveBeenCalled();
    });

    it('keeps legacy callback lists explicit replacements', () => {
        expect(transform('++x++ H~2~O', {plugins: []}).result.html).toBe('<p>++x++ H~2~O</p>\n');
        expect(transform('++x++ H~2~O', {plugins: [underline]}).result.html).toBe(
            '<p><u>x</u> H~2~O</p>\n',
        );
        expect(transform('++x++ H~2~O', {plugins: [subscript]}).result.html).toBe(
            '<p>++x++ H<sub>2</sub>O</p>\n',
        );
        expect(transform('++x++ H~2~O', {plugins: [underline, subscript]}).result.html).toBe(
            '<p><u>x</u> H<sub>2</sub>O</p>\n',
        );
    });

    it.each([false, true])(
        'retains title, heading, explicit ID and resource contracts with attrs=%s',
        (enableMarkdownAttrs) => {
            const {result} = transform(
                '# ++Title++ H~2~O {#title}\n\n## ++Section++ H~2~O {#section}',
                {
                    enableMarkdownAttrs,
                    extractTitle: true,
                },
            );
            expect(result.title).toContain('<u>Title</u> H<sub>2</sub>O');
            expect(result.headings[0].title).toContain('Section H2O');
            expect(result.headings[0].href).toBe('#section');
            const baseline = transform('# Title H2O {#title}\n\n## Section H2O {#section}', {
                enableMarkdownAttrs,
                extractTitle: true,
                plugins: DefaultPlugins.slice(0, 17),
            }).result;
            expect(Object.keys(result).sort()).toEqual(Object.keys(baseline).sort());
            expect(result.assets).toEqual(baseline.assets);
            expect(result.meta).toEqual(baseline.meta);
        },
    );
});
