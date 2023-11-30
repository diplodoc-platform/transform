import dedent from 'dedent';

import initMarkdown from '../src/transform/md';
import plugin from '../src/transform/plugins/block-anchor';
import anchorsPlugin from '../src/transform/plugins/anchors';

const {parse, compile} = initMarkdown({plugins: [plugin, anchorsPlugin]});

describe('block-anchor', function () {
    it('renders block-anchor', () => {
        const input = '{%anchor my-anchor%}';
        const expected = '<hr id="my-anchor" class="visually-hidden" />';
        const actual = compile(parse(input));

        expect(actual).toBe(expected);
    });

    it('parses anchors surrounded by other blocks', () => {
        const input = '# Heading \n\n {%anchor my-anchor%} \n\n paragraph with content';
        const actual = compile(parse(input));
        const expected = dedent`
        <h1 id="heading">\
            <a href="#heading" class="yfm-anchor" aria-hidden="true">\
                <span class="visually-hidden">\
                    Heading\
                </span>\
            </a>\
            Heading\
        </h1>
        <hr id="my-anchor" class="visually-hidden" />\
        <p>paragraph with content</p>\n`;
        expect(actual).toEqual(expected);
    });

    it('parses block anchors', () => {
        const input = '${%anchor my-anchor} Content';
        const actual = compile(parse(input));
        const expected = '<p>${%anchor my-anchor} Content</p>\n';

        expect(actual).toEqual(expected);
    });

    it('works with heading anchors', () => {
        const input = '# Heading {#heading-anchor} \n {%anchor my-anchor%}';
        const expected = dedent`
        <h1 id="heading-anchor">\
            <a href="#heading-anchor" class="yfm-anchor" aria-hidden="true">\
                <span class="visually-hidden">\
                    Heading\
                </span>\
            </a>\
            Heading\
        </h1>
        <hr id="my-anchor" class="visually-hidden" />`;
        const actual = compile(parse(input));

        expect(actual).toBe(expected);
    });

    it('does not parse produce an anchor if there is content before markup', () => {
        const input = 'Content  {%anchor my-anchor%}';
        const expected = '<p>Content </p>\n';
        const actual = compile(parse(input));
        expect(actual).toBe(expected);
    });
});
