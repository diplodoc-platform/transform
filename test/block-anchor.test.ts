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
        it('should render an a tag', () => {
            expect(transformYfm('{%anchor my-anchor%}')).toBe('<a id="my-anchor"></a>');
        });
        it('does not consume things it should not', () => {
            expect(transformYfm('# Heading \n {%anchor my-anchor%} \n # Other heading')).toContain(
                'Other heading',
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
                    '<a id="my-anchor"></a>',
            );
        });
    });
});
