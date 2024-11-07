import {dirname} from 'path';
import dedent from 'ts-dedent';

import includes from '../src/transform/plugins/includes';
import anchors from '../src/transform/plugins/anchors';
import {log} from '../src/transform/log';
import transform from '../src/transform';
import {getPublicPath} from '../src/transform/utilsFS';

const mocksPath = require.resolve('./mocks/link.md');
const html = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, anchors],
        path: mocksPath,
        root: dirname(mocksPath),
        getPublicPath,
    });
    return html;
};

describe('Anchors', () => {
    beforeEach(() => {
        log.clear();
    });

    it('should add single anchor with auto naming', () => {
        expect(
            html(dedent`
            ## Test

            Content
        `),
        ).toMatchSnapshot();
    });

    it('should add single anchor', () => {
        expect(
            html(dedent`
            ## Test {#test1}

            Content
        `),
        ).toMatchSnapshot();
    });

    it('should add multiple anchors', () => {
        expect(
            html(`
                ## Test {#test1} {#test2} {#test3}

                Content
        `),
        ).toMatchSnapshot();
    });

    it('should add single anchor when included', () => {
        expect(
            html(dedent`
            ## Test {#test0}

            Content before include

            {% include [test](./include-anchor.md) %}
        `),
        ).toMatchSnapshot();
    });

    it('should add multiple anchors when included', () => {
        expect(
            html(dedent`
            ## Test {#test0}

            Content before include

            {% include [test](./include-multiple-anchors.md) %}
        `),
        ).toMatchSnapshot();
    });

    it('should be transliterated correctly', () => {
        expect(
            html(dedent`
            ## Максимальный размер дисков

            Content
        `),
        ).toMatchSnapshot();
    });

    it('should be removed fences after transliteration', () => {
        expect(
            html(dedent`
                ## \`Test\`

                Content
            `),
        ).toMatchSnapshot();
    });

    it('should include content by anchor in sharped path file', () => {
        expect(
            html(dedent`
            Content before include

            {% include [file](./folder-with-#-sharp/file-with-#-sharp.md#anchor) %}

            After include
        `),
        ).toMatchSnapshot();
    });

    it('should add anchor with auto naming, using entire heading text', () => {
        expect(
            html(dedent`
            ## _Lorem ~~ipsum **dolor** sit~~ amet_

            Paragraph
        `),
        ).toMatchSnapshot();
    });

    describe('with extract title', () => {
        const transformWithTitle = (text: string) => {
            const {
                result: {html, title},
            } = transform(text, {
                plugins: [includes, anchors],
                path: mocksPath,
                root: dirname(mocksPath),
                extractTitle: true,
            });
            return [html, title];
        };

        it('should not add an anchor for level 1 heading', () => {
            const result = transformWithTitle(dedent`
                # Test {#test1}

                Content
            `);
            expect(result[0]).toMatchSnapshot();
            expect(result[1]).toBe('Test');
        });
    });

    describe('with disableSEOFixForTitles', () => {
        it('should not add anchor links when disableSEOFixForTitles is true', () => {
            const {
                result: {html},
            } = transform('## Test heading', {
                plugins: [includes, anchors],
                path: mocksPath,
                root: dirname(mocksPath),
                getPublicPath,
                disableSEOFixForTitles: true,
            });

            expect(html).toEqual('<h2 id="test-heading">Test heading</h2>\n');
        });

        it('should not add anchor links for custom anchors when disableSEOFixForTitles is true', () => {
            const {
                result: {html},
            } = transform('## Test heading {#custom-id}', {
                plugins: [includes, anchors],
                path: mocksPath,
                root: dirname(mocksPath),
                getPublicPath,
                disableSEOFixForTitles: true,
            });

            expect(html).toEqual('<h2 id="custom-id">Test heading</h2>\n');
        });
    });
});
