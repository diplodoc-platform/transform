import {load} from 'cheerio';

import sanitizeHtml, {defaultOptions} from '../src/transform/sanitize';

describe.each([false, true])(
    'SVG sanitization (disableStyleSanitizer=%s)',
    (disableStyleSanitizer) => {
        const sanitize = (content: string) =>
            sanitizeHtml(content, {...defaultOptions, disableStyleSanitizer});

        it('preserves gradient definitions and their references', () => {
            const output = sanitize(
                '<svg viewBox="0 0 100 100"><defs>' +
                    '<linearGradient id="linear"><stop offset="0%" stop-color="red"/></linearGradient>' +
                    '<radialGradient id="radial"><stop offset="100%" stop-color="blue"/></radialGradient>' +
                    '</defs><rect fill="url(#linear)"/><circle fill="url(#radial)"/></svg>',
            );
            const result = load(output);

            expect(output).toContain('<lineargradient id="linear">');
            expect(output).toContain('<radialgradient id="radial">');
            expect(result('svg').attr('viewBox')).toBe('0 0 100 100');
            expect(result('#linear')[0]?.name).toBe('linearGradient');
            expect(result('#radial')[0]?.name).toBe('radialGradient');
            expect(result('#linear stop').attr('stop-color')).toBe('red');
            expect(result('#radial stop').attr('stop-color')).toBe('blue');
            expect(result('rect').attr('fill')).toBe('url(#linear)');
            expect(result('circle').attr('fill')).toBe('url(#radial)');
        });

        it.each(['clipPath', 'textPath', 'linearGradient', 'radialGradient', 'animateTransform'])(
            'preserves the already-allowed %s element regardless of input casing',
            (tagName) => {
                for (const name of [tagName, tagName.toLowerCase(), tagName.toUpperCase()]) {
                    const result = load(sanitize(`<svg><${name} id="allowed"></${name}></svg>`));

                    expect(result('svg #allowed')).toHaveLength(1);
                    expect(result('#allowed')[0]?.name).toBe(tagName);
                }
            },
        );

        it('does not enable scripts, foreignObject, event handlers, or unsafe URLs', () => {
            const result = load(
                sanitize(
                    '<svg onload="alert(1)"><defs>' +
                        '<linearGradient id="gradient" onclick="alert(2)" xlink:href="javascript:alert(3)"/>' +
                        '</defs><script>alert(4)</script>' +
                        '<foreignObject><div>text</div></foreignObject>' +
                        '<a href="javascript:alert(5)">link</a>' +
                        '<use href="https://example.com/unsafe.svg#shape"/>' +
                        '<use xlink:href="javascript:alert(6)"/>' +
                        '<use href="#gradient"/></svg>',
                ),
            );

            expect(result('#gradient')[0]?.name).toBe('linearGradient');
            expect(result('script, [onload], [onclick]')).toHaveLength(0);
            expect(
                result('*')
                    .toArray()
                    .some(
                        (element) =>
                            'name' in element && element.name.toLowerCase() === 'foreignobject',
                    ),
            ).toBe(false);
            expect(result('#gradient').attr('xlink:href')).toBeUndefined();
            expect(result('a').attr('href')).toBeUndefined();
            expect(result('use[href]')).toHaveLength(1);
            expect(result('use[href]').attr('href')).toBe('#gradient');
            expect(
                result('use')
                    .toArray()
                    .every((element) => !result(element).attr('xlink:href')),
            ).toBe(true);
        });

        it('respects a caller-provided restrictive allowlist', () => {
            const result = sanitizeHtml('<svg><linearGradient id="gradient"/></svg>', {
                ...defaultOptions,
                disableStyleSanitizer,
                allowedTags: ['svg'],
            });

            expect(load(result)('svg')).toHaveLength(1);
            expect(result).not.toMatch(/lineargradient/i);
        });
    },
);
