import transform from '../src/transform';
import sanitizeHtml, {defaultOptions} from '../src/transform/sanitize';

const html = (text: string, options?: Parameters<typeof transform>[1]) => {
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
        expect(sanitizeHtml('<img src=a onerror=alert(1)>')).toMatchSnapshot();
    });

    describe('transform should sanitize html by default l', () => {
        describe('html in markdown', () => {
            it('should sanitize danger attributes', () => {
                expect(html('<img src="a" onerror=alert(1)>')).toMatchSnapshot();
            });

            it('should sanitize danger style attributes', () => {
                expect(html('<div style="position:fixed;font-size:14px"></div>')).toMatchSnapshot();
            });

            it('should sanitize danger properties in style tag', () => {
                expect(html('<style>h2 {color: red; position:fixed;}</style>')).toMatchSnapshot();
            });

            it('should sanitize form tag', () => {
                expect(
                    html('<form action="/do_something"><button>do</button></form>'),
                ).toMatchSnapshot();
            });
        });

        describe('plugin markdown-it-attrs', () => {
            it('should sanitize danger attributes', () => {
                expect(html('Click {onfocus="alert(1)" onclick="alert(1)"}')).toMatchSnapshot();
            });

            it('should not sanitize safe attributes', () => {
                expect(html('Click {.style-me data-toggle=modal}')).toMatchSnapshot();
            });

            it('should sanitize danger style attributes', () => {
                expect(
                    html(
                        '[example.com](https://example.com){style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: red; opacity: 0.5"}',
                    ),
                ).toMatchSnapshot();
            });
        });
    });

    describe("transform should't sanitize css with disableStyleSanitizer=true option", () => {
        const sanitizeOptions = {...defaultOptions, disableStyleSanitizer: true};

        describe('html in markdown', () => {
            it('should sanitize danger style attributes', () => {
                expect(
                    html('<div style="position:fixed;font-size:14px"></div>', {
                        sanitizeOptions,
                    }),
                ).toMatchSnapshot();
            });

            it('should sanitize danger properties in style tag', () => {
                expect(
                    html('<style>h2 {color: red; position:fixed;}</style>', {
                        sanitizeOptions,
                    }),
                ).toMatchSnapshot();
            });
        });

        describe('plugin markdown-it-attrs', () => {
            it('should sanitize danger style attributes', () => {
                expect(
                    html(
                        '[example.com](https://example.com){style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: red; opacity: 0.5"}',
                        {sanitizeOptions},
                    ),
                ).toMatchSnapshot();
            });
        });
    });

    describe('rewrite default sanitize options', () => {
        it('should not sanitize form tag if form is allowed', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.allowedTags = sanitizeOptions.allowedTags.concat(['form']);

            expect(
                html('<form action="/do_something"><button>do</button></form>', {
                    sanitizeOptions,
                }),
            ).toMatchSnapshot();
        });

        it('should filter style tag', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.allowedTags = sanitizeOptions.allowedTags.filter(
                (tag: string) => tag !== 'style',
            );

            expect(
                html('<style> h2 {color: red;} </style>', {
                    sanitizeOptions,
                }),
            ).toMatchSnapshot();
        });

        it('should filter style attribute', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.allowedAttributes['*'] = sanitizeOptions.allowedAttributes['*'].filter(
                (attr: string) => attr !== 'style',
            );

            expect(
                html('<div style="color: red;" size="13px"></div>', {
                    sanitizeOptions,
                }),
            ).toMatchSnapshot();
        });

        it('should not sanitize property if it is passed in cssWhiteList', () => {
            const sanitizeOptions = Object.assign({}, defaultOptions);

            // @ts-ignore
            sanitizeOptions.cssWhiteList['position'] = true;

            expect(
                html('<style>h2 {color: red; position:fixed;}</style>', {
                    sanitizeOptions,
                }),
            ).toMatchSnapshot();
        });
    });

    it('transform should not sanitize html if needToSanitizeHtml is false', () => {
        expect(html('<img src=a onerror=alert(1)>', {needToSanitizeHtml: false})).toMatchSnapshot();
    });

    describe('svg use' ,() => {
        it('should allow svg use with a local href', () => {
            const content = `<div>
                <svg>
                    <use xlink:href="#pattern-id"></use>
                </svg>
            </div>`
            expect(html(content)).toContain('<use xlink:href="#pattern-id"></use>');
        });

        it('should not allow external links in href', () => {
            const content = `<div>
                <svg>
                    <use xlink:href="https://example.com"></use>
                </svg>
            </div>`
            expect(html(content)).not.toContain('<use xlink:href="https://example.com"></use>');
        })

        it('should work for href as well', () => {
            const content = `<div>
                <svg>
                    <use href="#pattern-id"></use>
                </svg>
                <svg>
                    <use href="https://example.com"></use>
                </svg>
            </div>`
            expect(html(content)).toContain('<use href="#pattern-id"></use>');
            expect(html(content)).not.toContain('<use href="https://example.com"></use>');
        });
    });


});
