import type {MarkdownIt} from '../src/transform/typings';

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

    it('should linkify a strikethrough URL without consuming its closing marker', () => {
        const {
            result: {html},
        } = transform('~~https://example.com/path~~', {linkify: true});

        expect(html).toBe(
            '<p><s><a href="https://example.com/path">https://example.com/path</a></s></p>\n',
        );
    });

    it('should preserve a trailing tilde in a strikethrough URL', () => {
        const {
            result: {html},
        } = transform('~~https://example.com/~user~~~', {linkify: true});

        expect(html).toBe(
            '<p><s><a href="https://example.com/~user~">https://example.com/~user~</a></s></p>\n',
        );
    });

    it('should preserve trailing tildes outside strikethrough', () => {
        const {
            result: {html},
        } = transform('https://example.com/path~~', {linkify: true});

        expect(html).toBe(
            '<p><a href="https://example.com/path~~">https://example.com/path~~</a></p>\n',
        );
    });

    it('should ignore closed strikethrough before a URL with trailing tildes', () => {
        const {
            result: {html},
        } = transform('~~done~~ https://example.com/path~~', {linkify: true});

        expect(html).toBe(
            '<p><s>done</s> <a href="https://example.com/path~~">https://example.com/path~~</a></p>\n',
        );
    });

    it('should track strikethrough delimiters across multiple URLs', () => {
        const {
            result: {html},
        } = transform(
            '~~https://example.com/one~~ ~~https://example.com/two~~ https://example.com/three~~',
            {linkify: true},
        );

        expect(html).toBe(
            '<p><s><a href="https://example.com/one">https://example.com/one</a></s> ' +
                '<s><a href="https://example.com/two">https://example.com/two</a></s> ' +
                '<a href="https://example.com/three~~">https://example.com/three~~</a></p>\n',
        );
    });

    it('should respect the disabled linkify rule', () => {
        const {
            result: {html},
        } = transform('~~https://example.com/path~~', {
            linkify: true,
            disableRules: ['linkify'],
        });

        expect(html).toBe('<p><s>https://example.com/path</s></p>\n');
    });

    it('should allow a custom plugin to disable the replaced linkify rule', () => {
        const disableLinkify = (md: MarkdownIt) => md.disable('linkify');
        const {
            result: {html},
        } = transform('~~https://example.com/path~~', {
            linkify: true,
            plugins: [disableLinkify],
        });

        expect(html).toBe('<p><s>https://example.com/path</s></p>\n');
    });
});
