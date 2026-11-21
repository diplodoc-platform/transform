import {dirname} from 'path';
import dedent from 'ts-dedent';
import MarkdownIt from 'markdown-it';
import {load} from 'cheerio';

import includes from '../src/transform/plugins/includes';
import anchors from '../src/transform/plugins/anchors';
import {log} from '../src/transform/log';
import transform from '../src/transform';
import {getPublicPath} from '../src/transform/utilsFS';

const mocksPath = require.resolve('./mocks/link.md');
const html = (text: string, opts?: transform.Options) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, anchors],
        path: mocksPath,
        root: dirname(mocksPath),
        getPublicPath,
        enableMarkdownAttrs: false,
        ...opts,
    });
    return html;
};

const headingTokens = (text: string, opts: {extractTitle?: boolean; isLintRun?: boolean} = {}) => {
    const md = new MarkdownIt();

    md.use(anchors, {
        path: mocksPath,
        root: dirname(mocksPath),
        rootPublicPath: '',
        lang: 'en',
        log,
        transformLink: (value: string) => value,
        extractTitle: true,
        isLintRun: true,
        ...opts,
    });

    return md.parse(text, {}).filter((token) => token.type === 'heading_open');
};

describe('Anchors', () => {
    beforeEach(() => {
        log.clear();
    });

    it('should add single anchor with auto naming', () => {
        expect(
            html(dedent`
            ## Test

            Content
        `),
        ).toMatchSnapshot();
    });

    it('should add single anchor', () => {
        expect(
            html(dedent`
            ## Test {#test1}

            Content
        `),
        ).toMatchSnapshot();
    });

    it('should keep only the first id when an attribute block has duplicate ids', () => {
        const tokens = transform('## Title {#first #last}', {
            plugins: [anchors],
            enableMarkdownAttrs: true,
            tokens: true,
        });
        const heading = tokens.find((token) => token.type === 'heading_open');

        expect(heading?.attrs?.filter(([name]) => name === 'id')).toEqual([['id', 'first']]);
    });

    it('should add multiple anchors', () => {
        expect(
            html(`
                ## Test {#test1} {#test2} {#test3}

                Content
        `),
        ).toMatchSnapshot();
    });

    it('should add single anchor when included', () => {
        expect(
            html(dedent`
            ## Test {#test0}

            Content before include

            {% include [test](./include-anchor.md) %}
        `),
        ).toMatchSnapshot();
    });

    it.each([false, true])(
        'should use only the last included custom id (attrs=%s)',
        (enableMarkdownAttrs) => {
            const result = html('{% include [heading](./include-multiple-anchors.md) %}', {
                enableMarkdownAttrs,
            });
            const heading = load(result)('h1');

            expect(heading.attr('id')).toBe('test3');
            expect(heading.find('.yfm-anchor')).toHaveLength(1);
            heading.find('.yfm-anchor').remove();
            expect(heading.text()).toBe('Title {#test1} {#test2}');
        },
    );

    it('should add only the last custom anchor when included', () => {
        expect(
            html(dedent`
            ## Test {#test0}

            Content before include

            {% include [test](./include-multiple-anchors.md) %}
        `),
        ).toMatchSnapshot();
    });

    it('should be transliterated correctly', () => {
        expect(
            html(dedent`
            ## Максимальный размер дисков

            Content
        `),
        ).toMatchSnapshot();
    });

    it('should be removed fences after transliteration', () => {
        expect(
            html(dedent`
                ## \`Test\`

                Content
            `),
        ).toMatchSnapshot();
    });

    it('should include content by anchor in sharped path file', () => {
        expect(
            html(
                dedent`
            Content before include

            {% include [file](./folder-with-#-sharp/file-with-#-sharp.md#anchor) %}

            After include
        `,
                {enableMarkdownAttrs: true},
            ), // TODO: includes requires markdown-it-attrs plugin for find block with id=hash
        ).toMatchSnapshot();
    });

    it('should add anchor with auto naming, using entire heading text', () => {
        expect(
            html(dedent`
            ## _Lorem ~~ipsum **dolor** sit~~ amet_

            Paragraph
        `),
        ).toMatchSnapshot();
    });

    it('should add id for heading with allowed chars in fragment (RFC 3986) ', () => {
        expect(
            // heading contains all allowed chars in fragment (hash) in accordance with RFC 3986
            html(dedent`
                ## A-c~5%!$&(abc)*_+;xx,@=3/':b?b.b'

                Content
                `),
        ).toMatchSnapshot();
    });

    it('should remove quotes from id', () => {
        expect(
            // heading contains all allowed chars in fragment (hash) in accordance with RFC 3986
            html(dedent`
                ## «Heading» “with” "quotes'

                Content
                `),
        ).toMatchSnapshot();
    });

    describe('headings with angle brackets (text_special tokens)', () => {
        it('should generate distinct ids for headings differing only by angle bracket content', () => {
            const result = html(
                dedent`
                ## !inherit:<key>

                Content 1

                ## !inherit

                Content 2
            `,
                {disableCommonAnchors: true},
            );
            expect(result).toContain('id="inheritlesskeygreater"');
            expect(result).toContain('id="inherit"');
        });

        it('should include angle bracket content in auto-generated slug', () => {
            const result = html(
                dedent`
                ## Column <type> naming rules

                Content
            `,
                {disableCommonAnchors: true},
            );
            expect(result).toContain('id="column-lesstypegreater-naming-rules"');
        });
    });

    describe('with extract title', () => {
        const transformWithTitle = (text: string, opts?: Partial<transform.Options>) => {
            const {
                result: {html, title, meta},
            } = transform(text, {
                plugins: [includes, anchors],
                path: mocksPath,
                root: dirname(mocksPath),
                extractTitle: true,
                enableMarkdownAttrs: false,
                ...opts,
            });
            return {html, title, meta};
        };

        it('should not add an anchor for level 1 heading', () => {
            const {html, title} = transformWithTitle(dedent`
                # Test {#test1}

                Content
            `);
            expect(html).toMatchSnapshot();
            expect(title).toBe('Test');
        });

        it('should set custom id on heading_open token when extractTitle is true', () => {
            const {html} = transformWithTitle(dedent`
                # Page title {#custom-page-id}

                ## Section {#section-id}

                Content
            `);
            expect(html).not.toContain('Page title');
            expect(html).toContain('id="section-id"');
        });

        it('should extract title with angle brackets via text_special tokens', () => {
            const {title} = transformWithTitle(dedent`
                # Config <key> reference

                Content
            `);
            expect(title).toBe('Config <key> reference');
        });
    });

    describe('lint markers', () => {
        it('marks headings with empty automatic anchors', () => {
            const headings = headingTokens(dedent`
                ## 😀

                ## ☕

                中文
                ---
            `);

            expect(headings).toHaveLength(3);
            expect(headings.every((token) => token.attrGet('YFM021') === 'true')).toBe(true);
        });

        it('marks duplicate empty base anchors before adding numeric suffixes', () => {
            const headings = headingTokens(dedent`
                ## 😀

                ## 🚀
            `);

            expect(headings.map((token) => token.attrGet('id'))).toEqual(['', '1']);
            expect(headings.map((token) => token.attrGet('YFM021'))).toEqual(['true', 'true']);
        });

        it('does not mark valid automatic, explicit, or extracted title anchors', () => {
            const headings = headingTokens(dedent`
                # 😀

                ## Release 🚀 notes

                ## 😀 {#emoji-section}
            `);

            expect(headings.map((token) => token.attrGet('YFM021'))).toEqual([null, null, null]);
        });

        it('does not add lint markers during a regular transform', () => {
            const [heading] = headingTokens('## 😀', {isLintRun: false});

            expect(heading.attrGet('YFM021')).toBeNull();
            expect(html('## 😀')).not.toContain('YFM021');
        });
    });

    describe('with disableCommonAnchors', () => {
        it('should not add anchor links when disableCommonAnchors is true', () => {
            const {
                result: {html},
            } = transform('## Test heading', {
                plugins: [includes, anchors],
                path: mocksPath,
                root: dirname(mocksPath),
                getPublicPath,
                disableCommonAnchors: true,
                enableMarkdownAttrs: false,
            });

            expect(html).toEqual('<h2 id="test-heading">Test heading</h2>\n');
        });

        it('should not add anchor links for custom anchors when disableCommonAnchors is true', () => {
            const {
                result: {html},
            } = transform('## Test heading {#custom-id}', {
                plugins: [includes, anchors],
                path: mocksPath,
                root: dirname(mocksPath),
                getPublicPath,
                disableCommonAnchors: true,
                enableMarkdownAttrs: false,
            });

            expect(html).toEqual('<h2 id="custom-id">Test heading</h2>\n');
        });

        it('should keep the title placeholder and the space before it', () => {
            expect(html('## **Title** [{#T}] {#chapter}', {disableCommonAnchors: true})).toEqual(
                '<h2 id="chapter"><strong>Title</strong> [{#T}]</h2>\n',
            );
        });

        it('should keep a space after inline markup when a heading has a custom id', () => {
            const source = '## Open the **next** chapter {#chapter}';

            expect(html(source)).toContain('<strong>next</strong> chapter');
            expect(html(source, {disableCommonAnchors: true})).toEqual(
                '<h2 id="chapter">Open the <strong>next</strong> chapter</h2>\n',
            );
        });
    });

    describe.each([false, true])('custom heading ids (attrs=%s)', (enableMarkdownAttrs) => {
        it.each([
            {source: 'head\ning\n===', content: 'head<br>\ning', id: null},
            {source: 'head\ning {#id}\n===', content: 'head<br>\ning', id: 'id'},
            {source: 'head {#id}\ning\n===', content: 'head {#id}<br>\ning', id: null},
            {source: 'head\ning\n{#id}\n===', content: 'head<br>\ning', id: 'id'},
            {source: 'head\ning  \n{#id}\n===', content: 'head<br>\ning', id: 'id'},
            {source: 'head\ning\\\n{#id}\n===', content: 'head<br>\ning', id: 'id'},
            {
                source: 'head\ning\n{#id}\n{#other}\n===',
                content: 'head<br>\ning<br>\n{#id}',
                id: 'other',
            },
            {
                source: 'head\ning {#id}\n{#other}\n===',
                content: 'head<br>\ning {#id}',
                id: 'other',
            },
        ])(
            'should parse custom ids only at the end of a multiline heading: $source',
            ({source, content, id}) => {
                const result = transform(source, {
                    plugins: [anchors],
                    enableMarkdownAttrs,
                }).result;
                const heading = load(result.html)('h1');

                expect(heading.find('.yfm-anchor')).toHaveLength(1);
                if (id) {
                    expect(heading.attr('id')).toBe(id);
                    expect(heading.find('.yfm-anchor').attr('href')).toBe(`#${id}`);
                } else {
                    expect(heading.attr('id')).not.toBe('id');
                }
                heading.find('.yfm-anchor').remove();
                expect(heading.html()).toBe(content);
            },
        );

        it.each([
            ['## Title {#first} {#last}', 'Title {#first}'],
            ['## Title {#first}{#last}', 'Title {#first}'],
            ['## Title {#first .class} {#last}', 'Title {#first .class}'],
        ])('should use only the last custom id block: %s', (source, content) => {
            const result = transform(source, {
                plugins: [anchors],
                enableMarkdownAttrs,
            }).result;
            const heading = load(result.html)('h2');

            expect(heading.attr('id')).toBe('last');
            expect(heading.attr('class')).toBeUndefined();
            expect(heading.find('.yfm-anchor')).toHaveLength(1);
            heading.find('.yfm-anchor').remove();
            expect(heading.html()).toBe(content);
        });

        it('should use only the last mixed attribute block', () => {
            const result = transform('## Title {#first} {id="last" title="x"}', {
                plugins: [anchors],
                enableMarkdownAttrs,
            }).result;
            const heading = load(result.html)('h2');

            if (enableMarkdownAttrs) {
                expect(heading.attr('id')).toBe('last');
                expect(heading.attr('title')).toBe('x');
            }
            heading.find('.yfm-anchor').remove();
            expect(heading.html()).toBe(
                enableMarkdownAttrs ? 'Title {#first}' : 'Title {#first} {id="last" title="x"}',
            );
        });

        it('should keep linkify after a literal custom id', () => {
            const result = transform('## **Title**{#literal} https://example.com', {
                plugins: [anchors],
                enableMarkdownAttrs,
                linkify: true,
            }).result;
            const heading = load(result.html)('h2');
            heading.find('.yfm-anchor').remove();

            expect(heading.text()).toBe('Title{#literal} https://example.com');
            expect(heading.find('a').attr('href')).toBe('https://example.com');
        });

        it.each(['{#id}', '{ #id }', '{  #id  }', '[{#id}]'])(
            'should assign trailing custom ids to the heading: %s',
            (customId) => {
                const result = transform(`## **Title** ${customId}`, {
                    plugins: [anchors],
                    enableMarkdownAttrs,
                }).result;
                const heading = load(result.html)('h2');

                expect(heading.attr('id')).toBe('id');
                expect(heading.find('strong').attr('id')).toBeUndefined();
                heading.find('.yfm-anchor').remove();
                expect(heading.html()).toBe('<strong>Title</strong>');
            },
        );

        it.each([
            ['## Title {#one{#two}}', 'Title {#one{#two}}', 'Title {#one{#two}}'],
            ['## Title{  #id  }', 'Title{  #id  }', 'Title{  #id  }'],
            ['## Title{#id .class}', 'Title{#id .class}', 'Title{#id .class}'],
            ['## Title{id="id" title="x"}', 'Title{id="id" title="x"}', 'Title{id="id" title="x"}'],
            ['## {#id .class} Title', '{#id .class} Title', '{#id .class} Title'],
            ['## Title {#id .class} next', 'Title {#id .class} next', 'Title {#id .class} next'],
            ['## **Title**{#id .class}', '<strong>Title</strong>{#id .class}', 'Title{#id .class}'],
            ['## **Title{#id .class}**', '<strong>Title{#id .class}</strong>', 'Title{#id .class}'],
            ['## Title{#id}', 'Title{#id}', 'Title{#id}'],
            ['## **Title**{#id}', '<strong>Title</strong>{#id}', 'Title{#id}'],
            ['## `Title`{#id}', '<code>Title</code>{#id}', 'Title{#id}'],
            [
                '## [Title](https://example.com){#id}',
                '<a href="https://example.com">Title</a>{#id}',
                'Title{#id}',
            ],
            ['## ![Title](icon.svg){#id}', '<img src="icon.svg" alt="Title">{#id}', '{#id}'],
            ['## {#id} Title', '{#id} Title', '{#id} Title'],
            ['## Title {#id} next', 'Title {#id} next', 'Title {#id} next'],
            ['## Title {#id} **next**', 'Title {#id} <strong>next</strong>', 'Title {#id} next'],
            [
                '## Title {#id} {#alias} **next**',
                'Title {#id} {#alias} <strong>next</strong>',
                'Title {#id} {#alias} next',
            ],
            ['## Title {#id}next', 'Title {#id}next', 'Title {#id}next'],
            ['## **Title** {#id}next', '<strong>Title</strong> {#id}next', 'Title {#id}next'],
            ['## Title {#**id**}', 'Title {#<strong>id</strong>}', 'Title {#id}'],
            ['## Title {#*id*}', 'Title {#<em>id</em>}', 'Title {#id}'],
            ['## Title {#`id`}', 'Title {#<code>id</code>}', 'Title {#id}'],
            [
                '## Title {#[id](https://example.com)}',
                'Title {#<a href="https://example.com">id</a>}',
                'Title {#id}',
            ],
            ['## Title {#![id](icon.svg)}', 'Title {#<img src="icon.svg" alt="id">}', 'Title {#}'],
            ['## Title **{#id}**', 'Title <strong>{#id}</strong>', 'Title {#id}'],
            ['## **Title**{#id} next', '<strong>Title</strong>{#id} next', 'Title{#id} next'],
        ])(
            'should keep a nonterminal or formatted custom id as text: %s',
            (source, content, title) => {
                const result = transform(source, {
                    plugins: [anchors],
                    enableMarkdownAttrs,
                    needFlatListHeadings: true,
                }).result;
                const heading = load(result.html)('h2');

                expect(heading.find('.yfm-anchor span').text()).toBe(title);
                heading.find('.yfm-anchor').remove();
                expect(heading.html()).toBe(content);
                expect(result.headings[0].title).toBe(title);
            },
        );
    });

    it.each([false, true])(
        'should preserve heading custom ids in included files (attrs=%s)',
        (enableMarkdownAttrs) => {
            const result = html('{% include [headings](./include-heading-custom-ids.md) %}', {
                enableMarkdownAttrs,
            });
            const document = load(result);
            document('.yfm-anchor').remove();

            expect(
                document('h2')
                    .map((_index, element) => document(element).html())
                    .get(),
            ).toEqual([
                'Kept {#literal} heading',
                'Nested {#<strong>marked</strong>}',
                '<strong>No gap</strong>{#literal}',
                '<strong>Custom</strong>',
            ]);
            expect(document('h2').last().attr('id')).toBe('custom');
            expect(document('h1').attr('id')).toBe('multi');
            expect(document('h1').html()).toBe('head<br>\ning');
        },
    );

    describe('when useCommonAnchorButtons is true', () => {
        it('should replace anchor links with buttons', () => {
            expect(
                html('## Test heading', {
                    useCommonAnchorButtons: true,
                }),
            ).toMatchSnapshot();
        });

        it('should replace custom anchor links with buttons', () => {
            expect(
                html('## Test heading {#custom-id}', {
                    useCommonAnchorButtons: true,
                }),
            ).toMatchSnapshot();
        });

        it('should translate button title', () => {
            expect(
                html('## Test heading', {
                    useCommonAnchorButtons: true,
                    lang: 'en',
                }),
            ).toMatchSnapshot();
        });

        it('should not render button anchors when disableCommonAnchors is true', () => {
            expect(
                html('## Test heading', {
                    useCommonAnchorButtons: true,
                    disableCommonAnchors: true,
                }),
            ).toMatchSnapshot();
        });
    });
});
