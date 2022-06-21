import yfmTransform from '../src/transform';
import type {FileOptions} from '../src/transform/plugins/file/file';

const transform = (text: string, opts?: FileOptions): string => {
    const {
        result: {html},
    } = yfmTransform(text, {
        // override the default markdown-it-attrs delimiters,
        // to make it easier to check html for non-valid file markup
        leftDelimiter: '[',
        rightDelimiter: ']',
        ...opts,
    });
    return html;
};

const iconHtml = '<span class="yfm-file__icon"></span>';

describe('File plugin', () => {
    it('should render file', () => {
        expect(transform('{% file src="../file" name="file.txt" %}')).toBe(
            `<p><a href="../file" download="file.txt" class="yfm-file">${iconHtml}file.txt</a></p>\n`,
        );
    });

    it('should ignore file markup without params', () => {
        expect(transform('{% file %}')).toBe('<p>{% file %}</p>\n');
    });

    it('should not render file without all required attrs', () => {
        expect(transform('{% file src="../file" %}')).toBe(
            '<p>{% file src=&quot;../file&quot; %}</p>\n',
        );
        expect(transform('{% file name="file.txt" %}')).toBe(
            '<p>{% file name=&quot;file.txt&quot; %}</p>\n',
        );
    });

    it('should render file with text before', () => {
        expect(transform('download it {% file src="../file" name="file.txt" %}')).toBe(
            `<p>download it <a href="../file" download="file.txt" class="yfm-file">${iconHtml}file.txt</a></p>\n`,
        );
    });

    it('should render file with text after', () => {
        expect(transform('{% file src="../file" name="file.txt" %} don\'t download it')).toBe(
            `<p><a href="../file" download="file.txt" class="yfm-file">${iconHtml}file.txt</a> don't download it</p>\n`,
        );
    });

    it('should render file between text', () => {
        expect(transform('text {% file src="../file" name="file.txt" %} text')).toBe(
            `<p>text <a href="../file" download="file.txt" class="yfm-file">${iconHtml}file.txt</a> text</p>\n`,
        );
    });

    it('should map all specific file attrs to link html attrs', () => {
        expect(transform('{% file src="../file2" name="file2.txt" lang="en" %}')).toBe(
            `<p><a href="../file2" download="file2.txt" hreflang="en" class="yfm-file">${iconHtml}file2.txt</a></p>\n`,
        );
    });

    it('should pass allowed link html attrs', () => {
        expect(
            transform(
                '{% file src="../file1" name="file1.txt" referrerpolicy="origin" rel="help" target="_top" type="text/css" %}',
            ),
        ).toBe(
            `<p><a href="../file1" download="file1.txt" referrerpolicy="origin" rel="help" target="_top" type="text/css" class="yfm-file">${iconHtml}file1.txt</a></p>\n`,
        );
    });

    it('should ignore unknown attrs', () => {
        expect(transform('{% file src="../file" name="file.txt" foo="1" bar="2" baz="3" %}')).toBe(
            `<p><a href="../file" download="file.txt" class="yfm-file">${iconHtml}file.txt</a></p>\n`,
        );
    });

    it('should add extra attrs', () => {
        expect(
            transform('{% file src="../file" name="file.txt" %}', {
                fileExtraAttrs: [['data-yfm-file', 'yes']],
            }),
        ).toBe(
            `<p><a href="../file" download="file.txt" class="yfm-file" data-yfm-file="yes">${iconHtml}file.txt</a></p>\n`,
        );
    });

    it('should parse attrs with single quotes', () => {
        expect(transform("{% file src='index.txt' name='index.html' %}")).toBe(
            `<p><a href="index.txt" download="index.html" class="yfm-file">${iconHtml}index.html</a></p>\n`,
        );
    });

    it('should render with file markup in attributes', () => {
        expect(
            transform('{% file src="in%}dex.txt" name="{% file src=\'a\' name=\'b\' %}" %}'),
        ).toBe(
            `<p><a href="in%}dex.txt" download="{% file src='a' name='b' %}" class="yfm-file">${iconHtml}{% file src='a' name='b' %}</a></p>\n`,
        );
    });

    it('should render file with different order of attrs', () => {
        expect(transform('{% file type="text/html" name="page.html" src="../index.html" %}')).toBe(
            `<p><a type="text/html" download="page.html" href="../index.html" class="yfm-file">${iconHtml}page.html</a></p>\n`,
        );
    });

    it('should ignore additional special characters', () => {
        expect(transform('{% {% file src="index.txt" name="index.html" %} %}')).toBe(
            `<p>{% <a href="index.txt" download="index.html" class="yfm-file">${iconHtml}index.html</a> %}</p>\n`,
        );
    });

    it('should ignore additional file markup', () => {
        expect(transform('{% file {% file src="index.txt" name="index.html" %} %}')).toBe(
            `<p>{% file <a href="index.txt" download="index.html" class="yfm-file">${iconHtml}index.html</a> %}</p>\n`,
        );
    });

    it('should escape attrs', () => {
        expect(transform('{% file src="ind<ex.txt" name=\'ind"ex.ht&ml\' %}')).toBe(
            `<p><a href="ind&lt;ex.txt" download="ind&quot;ex.ht&amp;ml" class="yfm-file">${iconHtml}ind&quot;ex.ht&amp;ml</a></p>\n`,
        );
    });

    it('should allow quoutes in attribute value', () => {
        expect(transform('{% file src="ind\'ex.txt" name=\'ind"ex.html\' %}')).toBe(
            `<p><a href="ind'ex.txt" download="ind&quot;ex.html" class="yfm-file">${iconHtml}ind&quot;ex.html</a></p>\n`,
        );
    });

    it('should render file with extra spaces around attrs', () => {
        expect(
            transform('{% file  src="index.txt"   name="index.html"   type="text/html"  %}'),
        ).toBe(
            `<p><a href="index.txt" download="index.html" type="text/html" class="yfm-file">${iconHtml}index.html</a></p>\n`,
        );
    });

    it('should not render file without spaces around attrs', () => {
        expect(transform('{% file src="index.txt"name="index.html"type="text/html" %}')).toBe(
            `<p>{% file src=&quot;index.txt&quot;name=&quot;index.html&quot;type=&quot;text/html&quot; %}</p>\n`,
        );
    });

    it('should not render file with no spaces near borders', () => {
        expect(transform("{%file src='index.txt' name='index.html'%}")).toBe(
            `<p>{%file src='index.txt' name='index.html'%}</p>\n`,
        );
    });
});
