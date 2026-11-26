import type {Rule} from 'markdownlint';

import {load} from 'cheerio';
import {vi} from 'vitest';

import transform from '../src/transform';
import parser from '../src/transform/md';
import {defineTransformOptions} from '../src/transform/plugin-configuration';
import yfmlint from '../src/transform/yfmlint';
import {log} from '../src/transform/log';

beforeEach(() => log.clear());

describe.each([undefined, false, true])('general attrs policy %s', (enableMarkdownAttrs) => {
    test.each(['default', 'none'] as const)('flat and named %s presets agree', (preset) => {
        const core = {disableLiquid: true, enableMarkdownAttrs};
        const source = 'Hello {name}\n\nHello { name }\n\nParagraph {#paragraph .custom}';
        const flat = {...core, ...(preset === 'none' ? {plugins: []} : {})};
        const named = defineTransformOptions({core, plugins: {preset}});
        const actual = transform(source, flat).result.html;
        expect(transform(source, named).result.html).toBe(actual);
        const $ = load(actual);
        expect($('p').first().text()).toBe(enableMarkdownAttrs ? 'Hello' : 'Hello {name}');
        expect($('p').eq(1).text()).toBe(enableMarkdownAttrs ? 'Hello' : 'Hello { name }');
        expect($('p').last().attr('id')).toBe(enableMarkdownAttrs ? 'paragraph' : undefined);
        expect($('p').last().attr('class')).toBe(enableMarkdownAttrs ? 'custom' : undefined);
    });

    test('heading anchors and standalone image dimensions do not require general attrs', () => {
        const {html} = transform(
            '# Heading {#stable}\n\n![Image](image.png){width=120 height=40}',
            {
                disableLiquid: true,
                enableMarkdownAttrs,
            },
        ).result;
        const $ = load(html);
        expect($('h1').attr('id')).toBe('stable');
        expect($('img').attr('width')).toBe('120');
        expect($('img').attr('height')).toBe('40');
    });

    test.each(['absent', 'empty', 'populated'] as const)(
        'bundled lint matches renderer with %s custom plugins',
        (kind) => {
            const capture = vi.fn<Rule['function']>();
            const plugin = vi.fn();
            const input = 'Paragraph {#paragraph}\n';
            const rule: Rule = {
                names: ['ATTRS001'],
                tags: ['attrs'],
                description: 'Observe real parser input',
                function: capture,
            };
            yfmlint({
                input,
                enableMarkdownAttrs,
                ...(kind === 'absent' ? {} : {plugins: kind === 'empty' ? [] : [plugin]}),
                pluginOptions: {log, path: `attrs-${enableMarkdownAttrs}-${kind}.md`},
                customLintRules: [rule],
                defaultLintConfig: {default: false, ATTRS001: true, 'log-levels': {}},
            });
            expect(capture).toHaveBeenCalledOnce();
            const token = capture.mock.calls[0][0].tokens[0];
            const rendered = load(transform(input, {plugins: [], enableMarkdownAttrs}).result.html);
            expect(token.attrs).toEqual(enableMarkdownAttrs ? [['id', 'paragraph']] : null);
            expect(rendered('p').attr('id')).toBe(enableMarkdownAttrs ? 'paragraph' : undefined);
            if (kind === 'populated') expect(plugin).toHaveBeenCalledOnce();
        },
    );
});

test('parser handles retain their own explicit policy across documents', () => {
    const enabled = parser({plugins: [], enableMarkdownAttrs: true});
    const disabled = parser({plugins: []});
    const source = 'Paragraph {#stable}';
    for (let i = 0; i < 2; i++) {
        expect(enabled.compileDocument(enabled.parseDocument(source))).toContain('id="stable"');
        expect(disabled.compileDocument(disabled.parseDocument(source))).toContain('{#stable}');
    }
});
