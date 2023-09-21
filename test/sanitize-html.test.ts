import transform from '../src/transform';
import sanitizeHtml from '../src/transform/sanitize';
import {defaultOptions} from '../src/transform/sanitize';

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

    describe('transform should sanitize html by default l', () => {
        describe('html in markdown', () => {
            it('should sanitize danger attributes', () => {
                expect(transformYfm('<img src="a" onerror=alert(1)>')).toBe('<img src="a" />');
            });

            it('should sanitize danger style attributes', () => {
                expect(transformYfm('<div style="position:fixed;font-size:14px"></div>')).toBe(
                    '<div style="font-size:14px"></div>',
                );
            });

            it('should sanitize danger properties in style tag', () => {
                expect(transformYfm('<style>h2 {color: red; position:fixed;}</style>')).toBe(
                    '<style>h2 {\n  color: red;\n}</style>',
                );
            });

            it('should sanitize form tag', () => {
                expect(
                    transformYfm('<form action="/do_something"><button>do</button></form>'),
                ).toBe('<button>do</button>');
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

            it('should sanitize danger style attributes', () => {
                expect(
                    transformYfm(
                        '[example.com](https://example.com){style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: red; opacity: 0.5"}',
                    ),
                ).toBe(
                    '<p><a href="https://example.com" style="width:100%;height:100%;background-color:red">example.com</a></p>\n',
                );
            });
        });
    });

    describe('rewrite default sanitize options', () => {
        it('should not sanitize form tag if form is allowed', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.allowedTags = sanitizeOptions.allowedTags.concat(['form']);

            expect(
                transformYfm('<form action="/do_something"><button>do</button></form>', {
                    sanitizeOptions,
                }),
            ).toBe('<form action="/do_something"><button>do</button></form>');
        });

        it('should filter style tag', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.allowedTags = sanitizeOptions.allowedTags.filter(
                (tag: string) => tag !== 'style',
            );

            expect(
                transformYfm('<style> h2 {color: red;} </style>', {
                    sanitizeOptions,
                }),
            ).toBe('');
        });

        it('should filter style attribute', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.allowedAttributes['*'] = sanitizeOptions.allowedAttributes['*'].filter(
                (attr: string) => attr !== 'style',
            );

            expect(
                transformYfm('<div style="color: red;" size="13px"></div>', {
                    sanitizeOptions,
                }),
            ).toBe('<div size="13px"></div>');
        });

        it('should not sanitize property if it is passed in cssWhiteList', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.cssWhiteList['position'] = true;

            expect(
                transformYfm('<style>h2 {color: red; position:fixed;}</style>', {
                    sanitizeOptions,
                }),
            ).toBe('<style>h2 {\n  color: red;\n  position: fixed;\n}</style>');
        });
    });

    it('transform should not sanitize html if needToSanitizeHtml is false', () => {
        expect(transformYfm('<img src=a onerror=alert(1)>', {needToSanitizeHtml: false})).toBe(
            '<img src=a onerror=alert(1)>',
        );
    });
});
