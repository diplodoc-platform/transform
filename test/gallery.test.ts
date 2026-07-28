import {dirname, resolve} from 'path';
import {unlinkSync, writeFileSync} from 'fs';

import transform from '../src/transform';
import images, {isGallerySize} from '../src/transform/plugins/images';
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

    test('should respect explicit gallery=false attribute', () => {
        const html = transformYfm('![test](./test.png){gallery=false}');
        expect(html).toContain('data-gallery="false"');
    });

    test('should override text sibling heuristic with explicit gallery=true', () => {
        const html = transformYfm('текст ![test](./test.png){gallery=true} ещё текст');
        expect(html).toContain('data-gallery="true"');
    });

    test('should disable gallery for small declared size', () => {
        const html = transformYfm('![test](./test.png){width=100 height=100}');
        expect(html).toContain('data-gallery="false"');
    });

    test('should enable gallery for large declared size', () => {
        const html = transformYfm('![test](./test.png){width=300 height=300}');
        expect(html).toContain('data-gallery="true"');
    });

    test('should handle only width specified', () => {
        const html = transformYfm('![test](./test.png){width=100}');
        expect(html).toContain('data-gallery="false"');
    });

    test('should handle only height specified', () => {
        const html = transformYfm('![test](./test.png){height=100}');
        expect(html).toContain('data-gallery="false"');
    });

    test('should disable gallery when image is inline with text', () => {
        const html = transformYfm('текст ![test](./test.png) ещё текст');
        expect(html).toContain('data-gallery="false"');
    });

    test('should enable gallery by default when no conditions prevent it', () => {
        const html = transformYfm('![test](./test.png)');
        expect(html).toContain('data-gallery="true"');
    });

    test('should handle malformed gallery attribute', () => {
        const html = transformYfm('![test](./test.png){gallery=yes}');
        expect(html).toContain('data-gallery="true"');
    });

    test('should handle empty gallery attribute', () => {
        const html = transformYfm('![test](./test.png){gallery=}');
        expect(html).toContain('data-gallery="true"');
    });

    test('should handle inline SVG with gallery attribute', () => {
        const imagePath = resolve(dirname(mocksPath), 'test.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';
        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![test](./test.svg){inline=true gallery=true}');
        expect(html).toContain('data-gallery="true"');

        unlinkSync(imagePath);
    });

    test('should not add gallery attribute when not needed', () => {
        const html = transformYfm('![test](./test.png)');
        expect(html).toContain('data-gallery="true"');
    });

    test('should detect small image when width < 150', () => {
        expect(isGallerySize('100', '200')).toBe(false);
    });

    test('should detect small image when height < 150', () => {
        expect(isGallerySize('200', '100')).toBe(false);
    });

    test('should detect large image when both > 150', () => {
        expect(isGallerySize('200', '200')).toBe(true);
    });

    test('should not apply rule when width is missing', () => {
        expect(isGallerySize(null, '100')).toBe(false);
    });

    test('should not apply rule when width is invalid', () => {
        expect(isGallerySize('abc', '100')).toBe(false);
    });
});
