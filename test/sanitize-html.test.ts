import transform from '../src/transform';
import sanitizeHtml from '../src/transform/sanitize';

const transformYfm = (text: string, options?: Parameters<typeof transform>[1]) => {
    const {
        result: {html},
    } = transform(text, {
        allowHTML: true,
        ...options,
    });
    return html;
};

describe('Sanitize HTML utility', () => {
    it('sanitize-utility should sanitize html', () => {
        expect(sanitizeHtml('<img src=a onerror=alert(1)>')).toBe('<img src="a" />');
    });

    describe('by default transform should sanitize html', () => {
        describe('html in markdown', () => {
            it('should sanitize danger attributes', () => {
                expect(transformYfm('<img src="a" onerror=alert(1)>')).toBe('<img src="a" />');
            });

            it('should not sanitize style tag', () => {
                expect(transformYfm('<style>h2 {color: red;}</style>')).toBe(
                    '<style>h2 {color: red;}</style>',
                );
            });
        });

        describe('plugin markdown-it-attrs', () => {
            it('should sanitize danger attributes', () => {
                expect(transformYfm('Click {onfocus="alert(1)" onclick="alert(1)"}')).toBe(
                    '<p>Click</p>\n',
                );
            });

            it('should not sanitize safe attributes', () => {
                expect(transformYfm('Click {.style-me data-toggle=modal}')).toBe(
                    '<p class="style-me" data-toggle="modal">Click</p>\n',
                );
            });

            it('should not sanitize style attribute', () => {
                expect(
                    transformYfm(
                        '[example.com](https://example.com){style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: red; opacity: 0.5"}',
                    ),
                ).toBe(
                    '<p><a href="https://example.com" style="position:fixed;top:0;left:0;width:100%;height:100%;background-color:red;opacity:0.5">example.com</a></p>\n',
                );
            });
        });
    });

    it('transform should not sanitize html', () => {
        expect(transformYfm('<img src=a onerror=alert(1)>', {needToSanitizeHtml: false})).toBe(
            '<img src=a onerror=alert(1)>',
        );
    });
});
