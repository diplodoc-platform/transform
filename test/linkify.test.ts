import transform from '../src/transform';

describe('Linkify', () => {
    it('should not linkify .cloud tld without linkifyTlds option', () => {
        const {
            result: {html},
        } = transform('yandex.cloud');

        expect(html).toMatchSnapshot();
    });
    it('should linkify .cloud tld with linkifyTlds option', () => {
        const {
            result: {html},
        } = transform('yandex.cloud', {linkifyTlds: 'cloud', linkify: true});

        expect(html).toMatchSnapshot();
    });
});
