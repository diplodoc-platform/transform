import type {MarkdownIt as MarkdownItInstance, ParserEnv} from '../src/transform/typings';

import MarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';

import {migrateImageDimensions} from '../src/transform/migrations/image-dimensions';
import transform from '../src/transform';

describe('image migration review proof boundaries', () => {
    it('bounds document parsing and processed characters for independent paragraphs', () => {
        const original = MarkdownIt.prototype.parse;
        const measurements: {length: number; chars: number; full: number}[] = [];
        for (const count of [16, 32]) {
            const source = Array.from(
                {length: count},
                (_, index) => `Paragraph ${index} ![Diagram ${index}](img.png =100x200)`,
            ).join('\n\n');
            let chars = 0;
            let full = 0;
            const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
                this: MarkdownItInstance,
                input,
                env,
            ) {
                chars += input.length;
                if (input.length >= source.length) full++;
                return original.call(this, input, env);
            });
            try {
                const result = migrateImageDimensions(source);
                expect(result.edits).toHaveLength(count * 2);
                expect(result.diagnostics).toEqual([]);
                measurements.push({length: source.length, chars, full});
            } finally {
                spy.mockRestore();
            }
        }
        expect(measurements.every(({full}) => full <= 9)).toBe(true);
        expect(measurements[1].chars / measurements[0].chars).toBeLessThan(2.5);
    });

    it('keeps document reference facts available to isolated paragraphs', () => {
        const source =
            '![a](a =20x30) [linked][target]\n\n' +
            '![b](b =40x50) ![modern][image]\n\n' +
            '[target]: https://example.com "Link"\n[image]: modern.png "Image"';
        const result = migrateImageDimensions(source);
        expect(result.edits).toHaveLength(4);
        expect(result.diagnostics).toEqual([]);
        expect(result.output).toContain('[target]: https://example.com "Link"');
        expect(migrateImageDimensions(result.output).edits).toEqual([]);
    });

    it('refuses individual CSS changes even when a combined candidate would compensate', () => {
        const original = MarkdownIt.prototype.parse;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env: ParserEnv,
        ) {
            const tokens = original.call(this, input, env);
            if ((input.match(/\{width=20 height=30\}/g) ?? []).length === 1) {
                env.additionalOptionsCssWhiteList = {
                    ...env.additionalOptionsCssWhiteList,
                    'unproved-candidate': true,
                };
            }
            return tokens;
        });
        try {
            const source = '![a](a =20x30)\n\n![b](b =20x30)';
            expect(migrateImageDimensions(source).edits).toEqual([]);
        } finally {
            spy.mockRestore();
        }
    });

    it('keeps a proven paragraph when a different local candidate fails', () => {
        const original = MarkdownIt.prototype.parse;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env: ParserEnv,
        ) {
            const tokens = original.call(this, input, env);
            if (input.startsWith('![a](a){width=20 height=30}')) {
                env.additionalOptionsCssWhiteList = {'unproved-candidate': true};
            }
            return tokens;
        });
        try {
            const source = '![a](a =20x30)\n\n![b](b =40x50)';
            const result = migrateImageDimensions(source);
            expect(result.output).toBe('![a](a =20x30)\n\n![b](b){width=40 height=50}');
            expect(result.diagnostics[0].reason).toBe('equivalence-check-failed');
        } finally {
            spy.mockRestore();
        }
    });

    it('rolls back every edit when the mandatory combined document proof fails', () => {
        const original = MarkdownIt.prototype.parse;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env: ParserEnv,
        ) {
            const tokens = original.call(this, input, env);
            if (
                input.includes('![a](a){width=20 height=30}') &&
                input.includes('![b](b){width=40 height=50}')
            ) {
                env.additionalOptionsCssWhiteList = {'unproved-final': true};
            }
            return tokens;
        });
        try {
            const source = '![a](a =20x30)\n\n![b](b =40x50)';
            const result = migrateImageDimensions(source);
            expect(result.output).toBe(source);
            expect(result.edits).toEqual([]);
            expect(
                result.diagnostics.every(({reason}) => reason === 'equivalence-check-failed'),
            ).toBe(true);
        } finally {
            spy.mockRestore();
        }
    });

    it('locates exhausted complex proofs while retaining independent local paragraphs', () => {
        const complex = Array.from(
            {length: 12},
            (_, index) => `- Item ${index} ![a](a =20x30)`,
        ).join('\n\n');
        const source = complex + '\n\nRoot ![b](b =40x50)';
        const result = migrateImageDimensions(source, {path: 'budget.md'});
        expect(result.edits).toHaveLength(18);
        const deferred = result.diagnostics.filter(
            ({reason}) => reason === 'equivalence-budget-exceeded',
        );
        expect(deferred).toHaveLength(4);
        expect(
            deferred.every(
                ({path, offset, line, column}) =>
                    path === 'budget.md' && source[offset] === '=' && line > 0 && column > 0,
            ),
        ).toBe(true);
        expect(result.output.endsWith('Root ![b](b){width=40 height=50}')).toBe(true);
    });

    it('bounds source copies and normalization after complex proofs exhaust their budget', () => {
        const marker = 'SOURCE_COPY_PROBE';
        const measurements: {copied: number; normalized: number}[] = [];
        for (const count of [20, 40]) {
            const source =
                marker +
                '\n\n' +
                Array.from({length: count}, (_, index) => `- ${index} ![a](a =20x30)`).join('\n\n');
            const slice = String.prototype.slice;
            const join = Array.prototype.join;
            let copied = 0;
            let normalized = 0;
            const sliceSpy = vi.spyOn(String.prototype, 'slice').mockImplementation(function (
                this: string,
                ...args: [number?, number?]
            ) {
                const output = slice.apply(this, args);
                if (String(this) === source) copied += output.length;
                return output;
            });
            const joinSpy = vi.spyOn(Array.prototype, 'join').mockImplementation(function (
                this: unknown[],
                ...args: [string?]
            ) {
                const output = join.apply(this, args);
                if (this.length === output.length && args[0] === '' && output.startsWith(marker))
                    normalized += output.length;
                return output;
            });
            try {
                const result = migrateImageDimensions(source);
                expect(result.edits).toHaveLength(16);
                expect(
                    result.diagnostics.filter(
                        ({reason}) => reason === 'equivalence-budget-exceeded',
                    ),
                ).toHaveLength(count - 8);
                measurements.push({copied, normalized});
            } finally {
                sliceSpy.mockRestore();
                joinSpy.mockRestore();
            }
        }
        expect(measurements[0].normalized).toBeGreaterThan(0);
        expect(measurements[1].copied / measurements[0].copied).toBeLessThan(2.5);
        expect(measurements[1].normalized / measurements[0].normalized).toBeLessThan(2.5);
    });

    it('diagnoses an actual HTML-disabled image without editing the HTML container', () => {
        const source = '\uFEFF😀\r\n\r\n<div>\r\n😀 ![a](i.png =1x2)\r\n</div>';
        const result = migrateImageDimensions(source, {path: 'html.md'});
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics).toEqual([
            expect.objectContaining({
                reason: 'html-disabled-image',
                offset: source.indexOf('=1x2'),
                line: 4,
                column: 15,
                path: 'html.md',
            }),
        ]);
    });

    it('explains the rendering-policy gap and retains normal images outside HTML', () => {
        const html = '<div>\n![a](a =2x3)\n</div>';
        const result = migrateImageDimensions(html + '\n\n![b](b =40x50)');
        expect(result.output).toBe(html + '\n\n![b](b){width=40 height=50}');
        expect(result.edits).toHaveLength(2);
        expect(result.diagnostics.map(({reason}) => reason)).toEqual(['html-disabled-image']);
        expect(transform(html, {disableLiquid: true, allowHTML: false}).result.html).toContain(
            '<img src="a" alt="a" width="2" height="3"',
        );
        expect(transform(html, {disableLiquid: true, allowHTML: true}).result.html).toContain(
            '![a](a =2x3)',
        );
    });

    it.each([
        '<!--\n![a](a =2x3)\n-->',
        '<script>\n![a](a =2x3)\n</script>',
        '<pre>\n![a](a =2x3)\n</pre>',
        '<style>\n![a](a =2x3)\n</style>',
        '<textarea>\n![a](a =2x3)\n</textarea>',
        '<div>\n<!--\n![a](a =2x3)\n-->\n</div>',
        '<div>\n<div>\n![a](a =2x3)\n</div>\n</div>',
        '<custom>\n![a](a =2x3)\n</custom>',
        '```html\n<div>\n![a](a =2x3)\n</div>\n```',
        '<div>\n\\![a](a =2x3)\n</div>',
    ])('retains protected HTML examples without diagnostics: %s', (source) => {
        expect(migrateImageDimensions(source)).toEqual({
            output: source,
            edits: [],
            diagnostics: [],
        });
    });
});
