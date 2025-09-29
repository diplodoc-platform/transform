import {dirname, resolve} from 'path';
import {unlinkSync, writeFileSync} from 'fs';
import MarkdownIt from 'markdown-it';

import transform from '../src/transform';
import images from '../src/transform/plugins/images';
import {log} from '../src/transform/log';

const mocksPath = require.resolve('./utils.ts');
const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [images],
        path: mocksPath,
        root: dirname(mocksPath),
    });

    return html;
};

describe('Images plugin', () => {
    beforeEach(() => {
        log.clear();
    });

    test('markdown-it encodes image src', () => {
        const md = new MarkdownIt();
        const tokens = md.parse('![тест](русские-символы.png)', {});
        const src = tokens[1].children?.[0].attrGet('src');

        expect(src).toBe(encodeURI('русские-символы.png'));
    });

    test('should handle local image links with cyrillic characters', () => {
        const imagePath = resolve(dirname(mocksPath), 'русские-символы.png');

        writeFileSync(imagePath, '');

        const html = transformYfm('![тест](./русские-символы.png)');

        expect(html).toEqual('<p><img src="/русские-символы.png" alt="тест" /></p>\n');
        expect(log.isEmpty()).toEqual(true);

        unlinkSync(imagePath);
    });

    test('should handle external image links with cyrillic characters', () => {
        const input = '![тест](https://example.com/русские-символы.png)';

        const {
            result: {html},
        } = transform(input, {
            plugins: [images],
        });

        expect(html).toEqual(
            '<p><img src="https://example.com/%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B5-%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB%D1%8B.png" alt="тест" /></p>\n',
        );
        expect(log.isEmpty()).toEqual(true);
    });

    test('should sanitize width and height attributes for inline SVG', () => {
        const imagePath = resolve(dirname(mocksPath), 'test.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

        writeFileSync(imagePath, svgContent);

        const html1 = transformYfm('![test](./test.svg){width=50 height=50 inline=true}');
        expect(html1).toContain('width="50"');
        expect(html1).toContain('height="50"');

        const html2 = transformYfm(
            '![test](./test.svg){width=\'100" onload="alert(1)\' height=\'100" onload="alert(1)\' inline=true}',
        );
        expect(html2).not.toContain('onload="alert(1)"');
        expect(html2).toContain('width="');
        expect(html2).not.toContain('onload="alert(1)"');

        unlinkSync(imagePath);
    });
});
