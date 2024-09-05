import transform from '../src/transform';
import monospace from '../src/transform/plugins/monospace';

const html = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [monospace],
    });
    return html;
};

describe('Monospace plugin', () => {
    it('should not render header', () => {
        expect(html('## Header')).toMatchSnapshot();
    });
    it('should render simple block', () => {
        expect(html('##text##')).toMatchSnapshot();
    });
    it('should render simple block with text before', () => {
        expect(html('test ##text##')).toMatchSnapshot();
    });
    it('should render simple block with text after', () => {
        expect(html('##text## test')).toMatchSnapshot();
    });
    it('should render simple block between texts', () => {
        expect(html('test ##text## test')).toMatchSnapshot();
    });
    it('should not render if open token incorrect', () => {
        expect(html('#asd##')).toMatchSnapshot();
    });
    it('should not render if space after open token', () => {
        expect(html('## test##')).toMatchSnapshot();
    });
    it('should not render if space before close token', () => {
        expect(html('##test ##')).toMatchSnapshot();
    });
    it('should not render opened token', () => {
        expect(html('test ##test')).toMatchSnapshot();
    });
    it('should render with open token inside', () => {
        expect(html('test1 ##test2 ##test3##')).toMatchSnapshot();
    });
    it('should render inline markup', () => {
        expect(html('##test **bold**##')).toMatchSnapshot();
    });
    it('should render siblings monospace', () => {
        expect(html('##test1## ##test2##')).toMatchSnapshot();
    });
    it('should not render with empty content', () => {
        expect(html('test #### test')).toMatchSnapshot();
    });
    it('should not render last open token', () => {
        expect(html('##test1 **bold**## test2 ##test3')).toMatchSnapshot();
    });
    it('should render content with #', () => {
        expect(html('###test##')).toMatchSnapshot();
    });
});
