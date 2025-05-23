import initMarkdown from '../src/transform/md';
import plugin from '../src/transform/plugins/block-anchor';
import anchorsPlugin from '../src/transform/plugins/anchors';

describe('block-anchor', () => {
    describe.each([
        ['markdown-it-attrs is disabled', false],
        ['markdown-it-attrs in enabled', true],
    ])('%s', (_0, enableMarkdownAttrs) => {
        const {parse, compile} = initMarkdown({
            plugins: [plugin, anchorsPlugin],
            enableMarkdownAttrs,
        });

        it('renders block-anchor', () => {
            const input = '{%anchor my-anchor%}';
            const actual = compile(parse(input));

            expect(actual).toMatchSnapshot();
        });

        it('parses anchors surrounded by other blocks', () => {
            const input = '# Heading \n\n {%anchor my-anchor%} \n\n paragraph with content';
            const actual = compile(parse(input));
            expect(actual).toMatchSnapshot();
        });

        it('parses block anchors', () => {
            const input = '${%anchor my-anchor} Content';
            const actual = compile(parse(input));

            expect(actual).toMatchSnapshot();
        });

        it('works with heading anchors', () => {
            const input = '# Heading {#heading-anchor} \n {%anchor my-anchor%}';
            const actual = compile(parse(input));

            expect(actual).toMatchSnapshot();
        });

        it('does not parse produce an anchor if there is content before markup', () => {
            const input = 'Content  {%anchor my-anchor%}';
            const actual = compile(parse(input));

            expect(actual).toMatchSnapshot();
        });

        it('handles multiple anchors in the input', () => {
            const input =
                '{%anchor first-anchor%}\n\nSome content\n\n{%anchor second-anchor%}\n\nSome more content\n\n{%anchor third-anchor%}';
            const actual = compile(parse(input));

            expect(actual).toMatchSnapshot();
        });
    });
});
