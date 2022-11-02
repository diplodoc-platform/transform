import transform from '../src/transform';

describe('Linkify', () => {
    it('should not linkify .cloud tld without linkifyTlds option', () => {
        const {
            result: {html},
        } = transform('yandex.cloud');

        expect(html).toBe('<p>yandex.cloud</p>\n');
    });
    it('should linkify .cloud tld with linkifyTlds option', () => {
        const {
            result: {html},
        } = transform('yandex.cloud', {linkifyTlds: 'cloud', linkify: true});

        expect(html).toBe('<p><a href="http://yandex.cloud">yandex.cloud</a></p>\n');
    });
});
