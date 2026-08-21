import {dirname} from 'path';
import dedent from 'ts-dedent';
import MarkdownIt from 'markdown-it';

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

    it('should add multiple anchors when included', () => {
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
    });

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
