import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import type Renderer from 'markdown-it/lib/renderer';
import type {MarkdownItPluginOpts} from '../src/transform/plugins/typings';
import type {Mock} from 'vitest';

import {escapeHtml} from 'markdown-it/lib/common/utils';
import {describe, expect, it, vi} from 'vitest';
import dd from 'ts-dedent';

import code from '../src/transform/plugins/code';

// same as in markdown-it
const fenceRenderFn = (tokens: Token[], index: number) =>
    `<pre><code>${escapeHtml(tokens[index].content)}</code></pre>\n`;

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

        it('should corretly add line-numbers to code with "$" symbols', () => {
            const fence = vi.fn(fenceRenderFn);
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: ' showLineNumbers',
                    content: 'my code\n\n"$"\n',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain(
                dd`
                <pre><code><span class="yfm-line-number">1</span>my code
                <span class="yfm-line-number">2</span>
                <span class="yfm-line-number">3</span>&quot;$&quot;
                </code></pre>
                `,
            );
        });

        it('should wrap lines of code to yfm-line spans', () => {
            const fence = vi.fn(fenceRenderFn);
            const md = getMd(fence);
            code(
                md as unknown as MarkdownIt,
                {codeLineWrapping: true} as unknown as MarkdownItPluginOpts,
            );

            const tokens = [
                {
                    info: 'markdown showLineNumbers',
                    content: 'line1\nline2\nline3',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(fence).toBeCalled();
            expect(result).toContain(
                '<span class="yfm-line-number">1</span><span class="yfm-line">line1</span>',
            );
            expect(result).toContain(
                '<span class="yfm-line-number">2</span><span class="yfm-line">line2</span>',
            );
            expect(result).toContain(
                '<span class="yfm-line-number">3</span><span class="yfm-line">line3</span>',
            );
        });

        it('should correctly wrap lines of code with "$" symbols', () => {
            const fence = vi.fn(fenceRenderFn);
            const md = getMd(fence);
            code(
                md as unknown as MarkdownIt,
                {codeLineWrapping: true} as unknown as MarkdownItPluginOpts,
            );

            const tokens = [
                {
                    info: ' showLineNumbers',
                    content: 'my code\n\n"$"\n',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain(
                dd`
                <pre><code><span class="yfm-line-number">1</span><span class="yfm-line">my code</span>
                <span class="yfm-line-number">2</span><span class="yfm-line"></span>
                <span class="yfm-line-number">3</span><span class="yfm-line">&quot;$&quot;</span>
                </code></pre>
                `,
            );
        });
    });

    describe('Multiline hljs spans', () => {
        it('should handle hljs span crossing multiple lines', () => {
            const fence = vi
                .fn()
                .mockReturnValue(
                    '<pre><code>before <span class="hljs-string">\'line1\nline2\nline3\'</span> after</code></pre>',
                );
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'sql showLineNumbers',
                    content: '',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain(
                '<span class="yfm-line-number">1</span>before <span class="hljs-string">\'line1</span>',
            );
            expect(result).toContain(
                '<span class="yfm-line-number">2</span><span class="hljs-string">line2</span>',
            );
            expect(result).toContain(
                '<span class="yfm-line-number">3</span><span class="hljs-string">line3\'</span> after',
            );
        });

        it('should handle nested multiline hljs spans', () => {
            const fence = vi
                .fn()
                .mockReturnValue(
                    '<pre><code><span class="hljs-section"><span class="hljs-keyword">line1\nline2</span></span></code></pre>',
                );
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'sql showLineNumbers',
                    content: '',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain(
                '<span class="yfm-line-number">1</span><span class="hljs-section"><span class="hljs-keyword">line1</span></span>',
            );
            expect(result).toContain(
                '<span class="yfm-line-number">2</span><span class="hljs-section"><span class="hljs-keyword">line2</span></span>',
            );
        });

        it('should not alter already-balanced single-line spans', () => {
            const fence = vi
                .fn()
                .mockReturnValue(
                    '<pre><code><span class="hljs-keyword">select</span> foo\n<span class="hljs-keyword">from</span> bar</code></pre>',
                );
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'sql showLineNumbers',
                    content: '',
                },
            ];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain(
                '<span class="yfm-line-number">1</span><span class="hljs-keyword">select</span> foo',
            );
            expect(result).toContain(
                '<span class="yfm-line-number">2</span><span class="hljs-keyword">from</span> bar',
            );
        });
    });

    describe('Line wrapping and Floating container', () => {
        it('should add "wrap" class to code tag when "wrap" is in token info', () => {
            const fence = vi.fn().mockReturnValue('<pre><code>some code</code></pre>');
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'javascript wrap',
                    content: 'some code',
                },
            ] as Token[];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('<code class="wrap">');
            expect(result).toContain('class="yfm-code-floating-container"');
        });

        it('should append "wrap" to existing classes in code tag', () => {
            const fence = vi
                .fn()
                .mockReturnValue('<pre><code class="hljs language-js">some code</code></pre>');
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'javascript wrap',
                    content: 'some code',
                },
            ] as Token[];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('<code class="hljs language-js wrap">');
        });

        it('should NOT render wrapping button if codeLineWrapping option is false', () => {
            const fence = vi.fn().mockReturnValue('<pre><code>some code</code></pre>');
            const md = getMd(fence);

            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {
                    info: 'javascript wrap',
                    content: 'some code',
                },
            ] as Token[];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('yfm-clipboard-button');
            expect(result).not.toContain('yfm-wrapping-button');
        });

        it('should render wrapping button if codeLineWrapping option is true', () => {
            const fence = vi.fn().mockReturnValue('<pre><code>some code</code></pre>');
            const md = getMd(fence);

            code(
                md as unknown as MarkdownIt,
                {codeLineWrapping: true} as unknown as MarkdownItPluginOpts,
            );

            const tokens = [
                {
                    info: 'javascript',
                    content: 'some code',
                },
            ] as Token[];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('yfm-wrapping-button');
            expect(result).toContain('aria-label="Toggle line wrapping"');
            expect(result).toContain('aria-pressed="true"');
        });

        it('should correctly pass token index as animation ID to floating container', () => {
            const fence = vi.fn().mockReturnValue('<pre><code>code</code></pre>');
            const md = getMd(fence);
            code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);

            const tokens = [
                {info: '', content: ''},
                {info: '', content: ''},
            ] as Token[];

            const result = md.renderer.rules.fence(tokens, 1, {}, {}, {} as Renderer);

            expect(result).toContain('data-animation="1"');
            expect(result).toContain('id="visibileAnimation-1"');
            expect(result).toContain('id="hideAnimation-1"');
            expect(result).toContain('begin="visibileAnimation-1.end+1"');
        });

        it('should combine showLineNumbers, wrap info, and codeLineWrapping plugin option seamlessly', () => {
            const fence = vi
                .fn()
                .mockReturnValue('<pre><code class="hljs">line1\nline2</code></pre>');
            const md = getMd(fence);
            code(
                md as unknown as MarkdownIt,
                {codeLineWrapping: true} as unknown as MarkdownItPluginOpts,
            );

            const tokens = [
                {
                    info: 'javascript showLineNumbers wrap',
                    content: 'line1\nline2',
                },
            ] as Token[];

            const result = md.renderer.rules.fence(tokens, 0, {}, {}, {} as Renderer);

            expect(result).toContain('<code class="hljs wrap">');
            expect(result).toContain(
                '<span class="yfm-line-number">1</span><span class="yfm-line">line1</span>',
            );
            expect(result).toContain('yfm-wrapping-button');
        });
    });
});
