import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import type Renderer from 'markdown-it/lib/renderer';
import type {MarkdownItPluginOpts} from '../src/transform/plugins/typings';
import type {Mock} from 'vitest';

import {describe, expect, it, vi} from 'vitest';

import code from '../src/transform/plugins/code';

const getMd = (fence: Mock) => ({
    renderer: {
        rules: {
            fence,
        },
    },
});

describe('Code', () => {
    it('should call default fence method', () => {
        const fence = vi.fn();
        const md = getMd(fence);
        code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

        const tokens = [
            {
                info: '',
                content: '',
            },
        ] as Token[];

        md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

        expect(fence).toHaveBeenCalledWith(tokens, 0, {}, {}, {} as Renderer);
    });

    describe('Line numbering', () => {
        it('should add line numbers to code with showLineNumbers option', () => {
            const fence = vi.fn().mockReturnValue('<pre><code>line1\nline2\nline3</code></pre>');
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'javascript showLineNumbers',
                    content: 'line1\nline2\nline3',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('<span class="yfm-line-number">1</span>line1');
            expect(result).toContain('<span class="yfm-line-number">2</span>line2');
            expect(result).toContain('<span class="yfm-line-number">3</span>line3');
        });

        it('should not add line numbers when showLineNumbers option is not present', () => {
            const fence = vi.fn().mockReturnValue('<pre><code>line1\nline2</code></pre>');
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'javascript',
                    content: 'line1\nline2',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).not.toContain('yfm-line-number');
            expect(result).toContain('line1');
            expect(result).toContain('line2');
        });

        it('should handle code with trailing newline correctly', () => {
            const fence = vi.fn().mockReturnValue('<pre><code>line1\nline2\n</code></pre>');
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'javascript showLineNumbers',
                    content: 'line1\nline2\n',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('<span class="yfm-line-number">1</span>line1');
            expect(result).toContain('<span class="yfm-line-number">2</span>line2');
            expect(result).toContain('\n');
        });

        it('should pad line numbers correctly for multi-digit line counts', () => {
            const fence = vi
                .fn()
                .mockReturnValue(
                    '<pre><code>line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10</code></pre>',
                );
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'javascript showLineNumbers',
                    content:
                        'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('<span class="yfm-line-number"> 1</span>line1');
            expect(result).toContain('<span class="yfm-line-number">10</span>line10');
        });
    });
});
