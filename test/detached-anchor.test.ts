import transform from '../src/transform';
import plugin from '../src/transform/plugins/detached-anchor';
import anchorsPlugin from '../src/transform/plugins/anchors';

let transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [plugin],
    });
    return html;
};

describe('detached-anchor', function () {
    describe('simple rendering', () => {
        it('should render an a tag', () => {
            expect(transformYfm('{#my-anchor}')).toBe('<a id="my-anchor"></a>');
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
            expect(transformYfm('# Heading {#heading-anchor} \n {#my-anchor}')).toBe(
                '<h1 id="heading-anchor">' +
                    '<a href="#heading-anchor" class="yfm-anchor" aria-hidden="true">' +
                    '<span class="visually-hidden">Heading</span></a>Heading</h1>\n' +
                    '<a id="my-anchor"></a>',
            );
        });
    });
});
