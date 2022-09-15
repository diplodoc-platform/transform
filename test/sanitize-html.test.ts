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

    it('transform should sanitize html', () => {
        expect(transformYfm('<img src=a onerror=alert(1)>', {needToSanitizeHtml: true})).toBe(
            '<img src="a" />',
        );
    });

    it('by default transform should not sanitize html', () => {
        expect(transformYfm('<img src=a onerror=alert(1)>')).toBe('<img src=a onerror=alert(1)>');
    });
});
