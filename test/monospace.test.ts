import transform from '../src/transform';
import monospace from '../src/transform/plugins/monospace';

const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [monospace],
    });
    return html;
};

describe('Monospace plugin', () => {
    it('should not render header', () => {
        expect(transformYfm('## Header')).toBe('<h2>Header</h2>\n');
    });
    it('should render simple block', () => {
        expect(transformYfm('##text##')).toBe('<p><samp>text</samp></p>\n');
    });
    it('should render simple block with text before', () => {
        expect(transformYfm('test ##text##')).toBe('<p>test <samp>text</samp></p>\n');
    });
    it('should render simple block with text after', () => {
        expect(transformYfm('##text## test')).toBe('<p><samp>text</samp> test</p>\n');
    });
    it('should render simple block between texts', () => {
        expect(transformYfm('test ##text## test')).toBe('<p>test <samp>text</samp> test</p>\n');
    });
    it('should not render if open token incorrect', () => {
        expect(transformYfm('#asd##')).toBe('<p>#asd##</p>\n');
    });
    it('should not render if space after open token', () => {
        expect(transformYfm('## test##')).toBe('<h2>test##</h2>\n');
    });
    it('should not render if space before close token', () => {
        expect(transformYfm('##test ##')).toBe('<p>##test ##</p>\n');
    });
    it('should not render opened token', () => {
        expect(transformYfm('test ##test')).toBe('<p>test ##test</p>\n');
    });
    it('should render with open token inside', () => {
        expect(transformYfm('test1 ##test2 ##test3##')).toBe(
            '<p>test1 ##test2 <samp>test3</samp></p>\n',
        );
    });
    it('should render inline markup', () => {
        expect(transformYfm('##test **bold**##')).toBe(
            '<p><samp>test <strong>bold</strong></samp></p>\n',
        );
    });
    it('should render siblings monospace', () => {
        expect(transformYfm('##test1## ##test2##')).toBe(
            '<p><samp>test1</samp> <samp>test2</samp></p>\n',
        );
    });
    it('should not render with empty content', () => {
        expect(transformYfm('test #### test')).toBe('<p>test #### test</p>\n');
    });
    it('should not render last open token', () => {
        expect(transformYfm('##test1 **bold**## test2 ##test3')).toBe(
            '<p><samp>test1 <strong>bold</strong></samp> test2 ##test3</p>\n',
        );
    });
    it('should render content with #', () => {
        expect(transformYfm('###test##')).toBe('<p>#<samp>test</samp></p>\n');
    });
});
