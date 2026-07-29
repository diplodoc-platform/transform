import {dirname, resolve} from 'path';
import {unlinkSync, writeFileSync} from 'fs';

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

describe('Images plugin gallery', () => {
    beforeEach(() => {
        log.clear();
    });

    test('should respect explicit gallery=true attribute', () => {
        const html = transformYfm('![test](./test.png){gallery=true}');
        expect(html).toContain('data-gallery="true"');
    });

    test('should respect explicit data-gallery=true attribute', () => {
        const html = transformYfm('![test](./test.png){data-gallery=true}');
        expect(html).toContain('data-gallery="true"');
    });

    test('should respect explicit gallery=false attribute', () => {
        const html = transformYfm('![test](./test.png){data-gallery=false}');
        expect(html).toContain('data-gallery="false"');
    });

    test('should override text sibling heuristic with explicit gallery=true', () => {
        const html = transformYfm('текст ![test](./test.png){data-gallery=true} ещё текст');
        expect(html).toContain('data-gallery="true"');
    });

    test('should handle malformed gallery attribute', () => {
        const html = transformYfm('![test](./test.png){data-gallery=yes}');
        expect(html).not.toContain('data-gallery="yes"');
    });

    test('should not handle empty gallery attribute', () => {
        const html = transformYfm('![test](./test.png){data-gallery=}');
        expect(html).not.toContain('data-gallery="true"');
    });

    test('should handle inline SVG with gallery attribute', () => {
        const imagePath = resolve(dirname(mocksPath), 'test.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';
        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![test](./test.svg){inline=true data-gallery=true}');
        expect(html).toContain('data-gallery="true"');

        unlinkSync(imagePath);
    });

    test('should not add gallery attribute when not set md attribute', () => {
        const html = transformYfm('![test](./test.png)');
        expect(html).not.toContain('data-gallery="true"');
    });
});
