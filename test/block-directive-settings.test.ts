import type {BrowserPluginConfiguration} from '../src/transform/browser/types';
import type {MarkdownIt} from '../src/transform/typings';
import type {PluginConfiguration} from '../src/transform/plugin-configuration';

import NativeMarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';

import parser from '../src/transform/md';
import transform from '../src/transform';
import {
    createParser as browserParser,
    transform as browserTransform,
} from '../src/transform/browser/standard';
import {parseDocumentFragment as browserFragment} from '../src/transform/browser/document';
import {transform as minimalTransform} from '../src/transform/browser/minimal';
import {createDocumentEnv, parseDocumentFragment} from '../src/transform/document';
import {definePlugin} from '../src/transform/plugin-configuration';
import cut from '../src/transform/plugins/cut';
import tabs from '../src/transform/plugins/tabs';
import notes from '../src/transform/plugins/notes';

const examples = [
    {
        id: 'cut',
        legacy: '{% cut "Title" %}\n\nBody\n\n{% endcut %}',
        colon: ':::cut [Title]\n\nBody\n\n:::',
        marker: 'yfm-cut',
    },
    {
        id: 'notes',
        legacy: '{% note info %}\n\nBody\n\n{% endnote %}',
        colon: ':::note {type=info}\n\nBody\n\n:::',
        marker: 'yfm-note',
    },
    {
        id: 'tabs',
        legacy: '{% list tabs %}\n\n- First\n\n  Body\n\n{% endlist %}',
        colon: ':::tabs\n\n- First\n\n  Body\n\n:::',
        marker: 'yfm-tabs',
    },
] as const;

describe('scoped block directive modes', () => {
    it.each(examples)(
        '$id supports disabled, enabled and only on Node and browser',
        ({id, legacy, colon, marker}) => {
            for (const mode of ['disabled', 'enabled', 'only'] as const) {
                const pluginConfiguration = {
                    preset: 'none' as const,
                    enable: [id],
                    options: {[id]: {directiveSyntax: mode}},
                };
                for (const render of [
                    (source: string) =>
                        transform(source, {disableLiquid: true, pluginConfiguration}).result.html,
                    (source: string) => browserTransform(source, {pluginConfiguration}).result.html,
                ]) {
                    expect(render(legacy).includes(marker)).toBe(mode !== 'only');
                    expect(render(colon).includes(marker)).toBe(mode !== 'disabled');
                }
            }
        },
    );
    it.each(examples)(
        '$id automatic defaults accept both syntaxes and legacy callbacks stay disabled',
        ({id, legacy, colon, marker}) => {
            for (const source of [legacy, colon]) {
                expect(transform(source, {disableLiquid: true}).result.html).toContain(marker);
                expect(browserTransform(source).result.html).toContain(marker);
            }
            const plugin = {cut, notes, tabs}[id];
            expect(
                transform(colon, {disableLiquid: true, plugins: [plugin]}).result.html,
            ).not.toContain(marker);
        },
    );
    it('retains Cut collector identity and descriptor', () => {
        const collect = cut.collect,
            descriptor = Object.getOwnPropertyDescriptor(cut, 'collect');
        expect(descriptor?.value).toBe(collect);
        expect(descriptor).toMatchObject({enumerable: true, writable: true, configurable: true});
        const md = new NativeMarkdownIt().use(cut, {directiveSyntax: 'enabled'});
        expect(md.render(':::cut [T]\n\nBody\n\n:::')).toContain('yfm-cut');
        expect(cut.collect).toBe(collect);
        expect(Object.getOwnPropertyDescriptor(cut, 'collect')).toEqual(descriptor);
    });
    it.each(['cut', 'notes', 'tabs'] as const)(
        'rejects invalid %s mode before installing any feature',
        (id) => {
            for (const mode of [null, false, 1, 'invalid']) {
                const effect = vi.fn();
                const custom = definePlugin<{}>({id: 'effect', setup: effect})({});
                const configuration = {
                    options: {[id]: {directiveSyntax: mode}},
                    plugins: [custom],
                } as PluginConfiguration;
                expect(() => parser({pluginConfiguration: configuration})).toThrow(
                    'Invalid directiveSyntax',
                );
                expect(effect).not.toHaveBeenCalled();
            }
        },
    );
    it('keeps minimal preset empty and File inline directives disabled', () => {
        expect(minimalTransform(':::note {type=info}\n\nBody\n\n:::').result.html).not.toContain(
            'yfm-note',
        );
        expect(browserTransform(':file[download](x.txt)').result.html).not.toContain('yfm-file');
    });
    it('reports malformed directives to each installation logger with current child path', () => {
        const logA = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        const logB = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        let mdA: MarkdownIt | undefined;
        const capture = definePlugin<{}>({
            id: 'capture',
            setup(md) {
                mdA = md;
            },
        })({});
        const pluginConfiguration = {
            options: {notes: {directiveSyntax: 'enabled' as const}},
            plugins: [capture],
        };
        const a = parser({path: 'root-a.md', log: logA, pluginConfiguration});
        const b = parser({
            path: 'root-b.md',
            log: logB,
            pluginConfiguration: {options: {notes: {directiveSyntax: 'enabled'}}},
        });
        a.parseDocument(':::note {type=bad}\n\nBody\n\n:::');
        b.parseDocument(':::note {type=bad}\n\nBody\n\n:::');
        expect(logA.warn.mock.calls.flat().join()).toContain('root-a.md');
        expect(logA.warn.mock.calls.flat().join()).not.toContain('root-b.md');
        expect(logB.warn.mock.calls.flat().join()).toContain('root-b.md');
        if (!mdA) throw new Error('Missing captured parser');
        parseDocumentFragment(mdA, ':::note {type=bad}\n\nBody\n\n:::', createDocumentEnv(), {
            purpose: 'reference',
            path: 'child.md',
        });
        expect(logA.warn.mock.calls.flat().join()).toContain('child.md');
    });
    it.each([
        ['cut', ':::cut {unknown=x}\n\nBody\n\n:::'],
        ['notes', ':::note {type=invalid}\n\nBody\n\n:::'],
        ['tabs', ':::tabs {variant=invalid}\n\n- First\n\n  Body\n\n:::'],
    ] as const)(
        'reports invalid %s parameters while preserving fallback Markdown',
        (id, source) => {
            const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
            const configuration = {
                preset: 'none' as const,
                enable: [id],
                options: {[id]: {directiveSyntax: 'enabled' as const}},
            };
            const result = transform(source, {
                disableLiquid: true,
                path: 'input.md',
                log,
                pluginConfiguration: configuration,
            });
            expect(result.result.html).toContain(':::');
            expect(log.warn.mock.calls.flat().join()).toContain('input.md');
            expect(log.warn.mock.calls.flat().join()).toContain('line 1');
        },
    );
    it('reports browser child diagnostics to its local logger and child path', () => {
        const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        let native: MarkdownIt | undefined;
        const capture = definePlugin<{}>({
            id: 'capture',
            setup(md) {
                native = md;
            },
        })({});
        const instance = browserParser({
            log,
            pluginConfiguration: {
                options: {notes: {directiveSyntax: 'enabled'}},
                plugins: [capture],
            },
        });
        instance.parseDocument('safe');
        if (!native) throw new Error('Missing browser parser');
        browserFragment(native, ':::note {type=bad}\n\nBody\n\n:::', createDocumentEnv(), {
            purpose: 'reference',
            path: 'browser-child.md',
        });
        expect(log.warn.mock.calls.flat().join()).toContain('browser-child.md');
    });
    it.each(['cut', 'notes', 'tabs'] as const)(
        'rejects invalid browser %s settings before custom setup',
        (id) => {
            const setup = vi.fn();
            const custom = definePlugin<{}>({id: 'effect', setup})({});
            const configuration = {
                options: {[id]: {directiveSyntax: 'invalid'}},
                plugins: [custom],
            } as BrowserPluginConfiguration;
            expect(() => browserTransform('text', {pluginConfiguration: configuration})).toThrow(
                'Invalid browser option',
            );
            expect(setup).not.toHaveBeenCalled();
        },
    );
    it('composes nested owner directives without affecting legacy callbacks', () => {
        const source =
            ':::cut [Outer]\n\n:::note {type=info}\n\n:::tabs\n\n- First\n\n  Body\n\n:::\n\n:::\n\n:::';
        const pluginConfiguration = {
            options: {
                cut: {directiveSyntax: 'enabled' as const},
                notes: {directiveSyntax: 'enabled' as const},
                tabs: {directiveSyntax: 'enabled' as const},
            },
        };
        for (const html of [
            transform(source, {disableLiquid: true, pluginConfiguration}).result.html,
            browserTransform(source, {pluginConfiguration}).result.html,
        ]) {
            expect(html).toContain('yfm-cut');
            expect(html).toContain('yfm-note');
            expect(html).toContain('yfm-tabs');
        }
    });
    it('preserves legacy output, resource metadata and ID allocation when all three modes are enabled', () => {
        const source = examples.map((item) => item.legacy).join('\n\n');
        const run = (enabled: boolean) => {
            const calls: string[] = [];
            const pluginConfiguration = enabled
                ? {
                      options: {
                          cut: {directiveSyntax: 'enabled' as const},
                          notes: {directiveSyntax: 'enabled' as const},
                          tabs: {directiveSyntax: 'enabled' as const},
                      },
                  }
                : undefined;
            const output = transform(source, {
                disableLiquid: true,
                pluginConfiguration,
                generateID: (prefix = '') => {
                    calls.push(prefix);
                    return `${prefix}-${calls.length}`;
                },
            });
            return {html: output.result.html, meta: output.result.meta, calls};
        };
        expect(run(true)).toEqual(run(false));
    });
    it('forwards notesAutotitle in enabled mode without warning on valid syntax', () => {
        const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        const output = transform(':::note {type=info}\n\nBody\n\n:::', {
            disableLiquid: true,
            log,
            pluginConfiguration: {
                options: {notes: {directiveSyntax: 'enabled', notesAutotitle: false}},
            },
        });
        expect(output.result.html).toContain('yfm-note');
        expect(output.result.html).not.toContain('yfm-note-title');
        expect(log.warn).not.toHaveBeenCalled();
    });
});
