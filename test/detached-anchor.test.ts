import transform from '../src/transform';
import plugin from '../src/transform/plugins/detached-anchor';

const transformYfm = (text: string) => {
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
    describe('with heading', () => {
        it('does not conflict with heading anchors', () => {
            expect(transformYfm('# Heading {#heading-anchor} \n {#my-anchor}')).toBe(
                '<h1 id="heading-anchor">Heading</h1>\n<a id="my-anchor"></a>',
            );
        });
    });
});
