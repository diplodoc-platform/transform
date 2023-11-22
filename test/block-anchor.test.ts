import transform from '../src/transform';
import plugin from '../src/transform/plugins/block-anchor';
import anchorsPlugin from '../src/transform/plugins/anchors';

let transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [plugin],
    });
    return html;
};

describe('block-anchor', function () {
    describe('simple rendering', () => {
        it('should render an hr tag', () => {
            expect(transformYfm('{%anchor my-anchor%}')).toBe(
                '<hr id="my-anchor" class="visually-hidden" />',
            );
        });
        it('does not consume things it should not', () => {
            expect(transformYfm('# Heading \n {%anchor my-anchor%} \n # Other heading')).toEqual(
                '<h1 id="heading"><a href="#heading" class="yfm-anchor" aria-hidden="true">' +
                    '<span class="visually-hidden">Heading</span></a>Heading</h1>\n' +
                    '<hr id="my-anchor" class="visually-hidden" /><h1 id="other-heading">' +
                    '<a href="#other-heading" class="yfm-anchor" aria-hidden="true">' +
                    '<span class="visually-hidden">Other heading</span></a>Other heading</h1>\n',
            );
        });

        it('does not match an anchor if theres something right in front of it', () => {
            expect(transformYfm('${%anchor my-anchor} Content')).toEqual(
                '<p>${%anchor my-anchor} Content</p>\n',
            );
        });
    });
    describe('with heading anchors', () => {
        transformYfm = (text) => {
            const {
                result: {html},
            } = transform(text, {plugins: [plugin, anchorsPlugin]});
            return html;
        };
        it('does not conflict with heading anchors', () => {
            expect(transformYfm('# Heading {#heading-anchor} \n {%anchor my-anchor%}')).toBe(
                '<h1 id="heading-anchor">' +
                    '<a href="#heading-anchor" class="yfm-anchor" aria-hidden="true">' +
                    '<span class="visually-hidden">Heading</span></a>Heading</h1>\n' +
                    '<hr id="my-anchor" class="visually-hidden" />',
            );
        });
    });
});
