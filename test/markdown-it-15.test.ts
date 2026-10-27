import type {MarkdownItPluginCb} from '../src/transform/typings';

import MarkdownIt from 'markdown-it';

import transform from '../src/transform';
import {getHrefTokenAttr, getSrcTokenAttr} from '../src/transform/utils';
import anchors from '../src/transform/plugins/anchors';

describe('markdown-it 15 compatibility', () => {
    it.each([
        ['example.com', '<a href="http://example.com">example.com</a>'],
        ['user@example.com', '<a href="mailto:user@example.com">user@example.com</a>'],
        [
            'https://user:pass@example.com/path',
            '<a href="https://user:pass@example.com/path">https://user:pass@example.com/path</a>',
        ],
    ])('preserves legacy linkify behavior for %s', (source, linked) => {
        expect(transform(source, {plugins: [], linkify: true}).result.html).toBe(
            `<p>${linked}</p>\n`,
        );
        expect(transform(source, {plugins: [], linkify: false}).result.html).toBe(
            `<p>${source}</p>\n`,
        );
    });

    it('keeps Unicode punctuation outside automatically detected URLs', () => {
        expect(
            transform('https://example.com/a，後半', {plugins: [], linkify: true}).result.html,
        ).toBe('<p><a href="https://example.com/a">https://example.com/a</a>，後半</p>\n');
    });

    it('does not let definition markers interrupt an ordinary paragraph', () => {
        expect(transform('a\nb\n: definition').result.html).toBe(
            '<p>a<br />\nb<br />\n: definition</p>\n',
        );
    });

    it('preserves nested definitions and the existing superscript plugin', () => {
        const source = 'Term\n: first\n\n    Nested\n    : second\n\nx^2^';
        expect(transform(source).result.html).toBe(
            '<dl>\n<dt>Term</dt>\n<dd>\n<p>first</p>\n<dl>\n<dt>Nested</dt>\n' +
                '<dd>second</dd>\n</dl>\n</dd>\n</dl>\n<p>x<sup>2</sup></p>\n',
        );
    });

    it('renders loose definitions with the paragraph required by deflist 4', () => {
        expect(transform('Term\n\n: first').result.html).toBe(
            '<dl>\n<dt>Term</dt>\n<dd>\n<p>first</p>\n</dd>\n</dl>\n',
        );
    });

    it('computes loose definition tightness independently for later definitions', () => {
        expect(transform('Term\n: first\n\n    continuation\n\n: second').result.html).toBe(
            '<dl>\n<dt>Term</dt>\n<dd>\n<p>first</p>\n<p>continuation</p>\n</dd>\n' +
                '<dd>second</dd>\n</dl>\n',
        );
    });

    it('keeps corrected alt text through Transform image handling and sanitization', () => {
        expect(
            transform('![a `code` <b>x</b>](https://example.com/image.png)', {allowHTML: true})
                .result.html,
        ).toBe(
            '<p><img src="https://example.com/image.png" alt="a code &lt;b&gt;x&lt;/b&gt;" /></p>\n',
        );
    });

    it('exposes parser classes and reference labels through the public API', () => {
        const md = new MarkdownIt();
        const state = new MarkdownIt.StateCore('[text][label]\n\n[label]: /url "Title"', md, {});
        md.core.process(state);
        const children = state.tokens.find((token) => token.type === 'inline')?.children;

        expect(children?.[0]).toBeInstanceOf(MarkdownIt.Token);
        expect(children?.[0].meta).toEqual({label: 'LABEL'});
        expect(state.tokens.some((token) => token.type === 'reference_definition')).toBe(false);
        expect(md.renderer.render(state.tokens, md.options, state.env)).toBe(
            '<p><a href="/url" title="Title">text</a></p>\n',
        );
    });

    it.each([
        ['`   `', '<p><code>   </code></p>\n'],
        ['[x](https://[::1]/a)', '<p><a href="https://[::1]/a">x</a></p>\n'],
        [
            '![a `code` <b>x</b>](image.png)',
            '<p><img src="image.png" alt="a code &lt;b&gt;x&lt;/b&gt;"></p>\n',
        ],
    ])('retains upstream parsing fixes for %s', (source, html) => {
        expect(new MarkdownIt({html: true}).render(source)).toBe(html);
    });

    it('retains sanitization when linkify accepts legacy URL authentication', () => {
        const {html} = transform(
            // eslint-disable-next-line no-script-url
            'javascript:alert(1) <img src="x" onerror="alert(1)"> https://user:pass@example.com/path',
            {
                linkify: true,
                allowHTML: true,
            },
        ).result;
        expect(html).not.toContain('href="javascript:');
        expect(html).toContain('href="https://user:pass@example.com/path"');
        expect(html).not.toContain('onerror');
    });

    it('preserves numeric zero attributes supplied by a custom plugin', () => {
        const attributes: string[] = [];
        const numericAttributes: MarkdownItPluginCb = (md) => {
            md.core.ruler.after('inline', 'numeric-attributes', (state) => {
                state.tokens
                    .filter((token) => token.type === 'heading_open')
                    .forEach((token) => token.attrSet('id', 0));
                const children =
                    state.tokens.find((token) => token.type === 'inline')?.children || [];
                for (const token of children) {
                    if (token.type === 'link_open') {
                        token.attrSet('href', 0);
                        attributes.push(getHrefTokenAttr(token));
                    }
                    if (token.type === 'image') {
                        token.attrSet('src', 0);
                        token.attrSet('width', 0);
                        attributes.push(getSrcTokenAttr(token));
                    }
                }
            });
        };

        const {html} = transform('[link](original) ![image](original)', {
            plugins: [numericAttributes],
        }).result;
        expect(attributes).toEqual(['0', '0']);
        expect(html).toBe('<p><a href="0">link</a> <img src="0" alt="image" width="0" /></p>\n');
        const heading = transform('## Heading {title="extra"}', {
            plugins: [numericAttributes, anchors],
            supportGithubAnchors: true,
        });
        expect(heading.result.html).toContain('id="0"');
        expect(heading.result.html).toContain('id="heading"');
        expect(heading.result.headings[0].href).toBe('#0');
    });

    it('rejects reference labels beyond the upstream Unicode code point limit', () => {
        const label = '😀'.repeat(1000);
        const env: Record<string, unknown> = {};
        new MarkdownIt().parse(`[${label}]: /url\n\n[text][${label}]`, env);
        expect(env.references).toBeUndefined();
    });
});
