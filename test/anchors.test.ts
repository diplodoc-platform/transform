import {dirname} from 'path';

import includes from '../src/transform/plugins/includes';
import anchors from '../src/transform/plugins/anchors';
import {log} from '../src/transform/log';
import transform from '../src/transform';

const mocksPath = require.resolve('./utils.ts');
const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, anchors],
        path: mocksPath,
        root: dirname(mocksPath),
    });
    return html;
};

describe('Anchors', () => {
    beforeEach(() => {
        log.clear();
    });

    it('should add single anchor with auto naming', () => {
        expect(transformYfm('## Test\n' + '\n' + 'Content\n')).toBe(
            '<h2 id="test"><a href="#test" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a>Test</h2>\n' +
                '<p>Content</p>\n',
        );
    });

    it('should add single anchor', () => {
        expect(transformYfm('## Test {#test1}\n' + '\n' + 'Content\n')).toBe(
            '<h2 id="test1"><a href="#test1" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a>Test</h2>\n' +
                '<p>Content</p>\n',
        );
    });

    it('should add multiple anchors', () => {
        expect(transformYfm('## Test {#test1} {#test2} {#test3}\n' + '\n' + 'Content\n')).toBe(
            '<h2 id="test1">' +
                '<a id="test3" href="#test3" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a>' +
                '<a id="test2" href="#test2" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a>' +
                '<a href="#test1" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a>Test</h2>\n' +
                '<p>Content</p>\n',
        );
    });

    it('should add single anchor when included', () => {
        expect(
            transformYfm(
                '## Test {#test0}\n' +
                    '\n' +
                    'Content before include\n' +
                    '\n' +
                    '{% include [test](./mocks/include-anchor.md) %}\n',
            ),
        ).toBe(
            '<h2 id="test0"><a href="#test0" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a>Test</h2>\n' +
                '<p>Content before include</p>\n' +
                '<h1 id="test1"><a href="#test1" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Title</span></a>Title</h1>\n' +
                '<p>Content</p>\n',
        );
    });

    it('should add multiple anchors when included', () => {
        expect(
            transformYfm(
                '## Test {#test0}\n' +
                    '\n' +
                    'Content before include\n' +
                    '\n' +
                    '{% include [test](./mocks/include-multiple-anchors.md) %}\n',
            ),
        ).toBe(
            '<h2 id="test0"><a href="#test0" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a>Test</h2>\n' +
                '<p>Content before include</p>\n' +
                '<h1 id="test1">' +
                '<a id="test3" href="#test3" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Title</span></a>' +
                '<a id="test2" href="#test2" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Title</span></a>' +
                '<a href="#test1" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Title</span></a>Title</h1>\n' +
                '<p>Content</p>\n',
        );
    });

    it('should be transliterated correctly', () => {
        expect(transformYfm('## Максимальный размер дисков \n' + '\n' + 'Content\n')).toBe(
            '<h2 id="maksimalnyj-razmer-diskov">' +
                '<a href="#maksimalnyj-razmer-diskov" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Максимальный размер дисков</span></a>' +
                'Максимальный размер дисков' +
                '</h2>\n' +
                '<p>Content</p>\n',
        );
    });

    it('should be removed fences after transliteration', () => {
        expect(transformYfm('## `Test`\n' + '\n' + 'Content\n')).toBe(
            '<h2 id="test">' +
                '<a href="#test" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Test</span></a><code>Test</code>' +
                '</h2>\n' +
                '<p>Content</p>\n',
        );
    });

    it('should include content by anchor in sharped path file', () => {
        expect(
            transformYfm(
                'Content before include\n' +
                    '\n' +
                    '{% include [file](./mocks/folder-with-#-sharp/file-with-#-sharp.md#anchor) %}\n' +
                    '\n' +
                    'After include',
            ),
        ).toBe(
            '<p>Content before include</p>\n' +
                '<h2 id="anchor"><a href="#anchor" class="yfm-anchor" aria-hidden="true"><span class="visually-hidden">Subtitle</span></a>Subtitle</h2>\n' +
                '<p>Subcontent</p>\n' +
                '<p>After include</p>\n',
        );
    });

    it('should add anchor with auto naming, using entire heading text', () => {
        expect(transformYfm('## _Lorem ~~ipsum **dolor** sit~~ amet_\n\nParagraph\n')).toBe(
            '<h2 id="lorem-ipsum-dolor-sit-amet">' +
                '<a href="#lorem-ipsum-dolor-sit-amet" class="yfm-anchor" aria-hidden="true">' +
                '<span class="visually-hidden">Lorem ipsum dolor sit amet</span></a>' +
                '<em>Lorem <s>ipsum <strong>dolor</strong> sit</s> amet</em></h2>\n' +
                '<p>Paragraph</p>\n',
        );
    });
});
