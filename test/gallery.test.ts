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
        const imagePath = resolve(dirname(mocksPath), 'test-gallery.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';
        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![test](./test-gallery.svg){inline=true data-gallery=true}');
        expect(html).toContain('data-gallery="true"');

        unlinkSync(imagePath);
    });

    test('should not add gallery attribute when not set md attribute', () => {
        const html = transformYfm('![test](./test.png)');
        expect(html).not.toContain('data-gallery="true"');
    });

    describe('gallery-id', () => {
        test('should convert gallery-id attribute into data-gallery-id', () => {
            const html = transformYfm('![test](./test.png){gallery-id=42}');

            expect(html).toContain('data-gallery-id="42"');
            expect(html).toContain('data-gallery="true"');
            expect(html).not.toMatch(/\sgallery-id=/);
        });

        test.each(['gallery=false gallery-id=42', 'gallery-id=42 gallery=false'])(
            'should prioritize gallery-id over gallery=false: %s',
            (attributes) => {
                const html = transformYfm(`![test](./test.png){${attributes}}`);

                expect(html).toContain('data-gallery-id="42"');
                expect(html).toContain('data-gallery="true"');
                expect(html).not.toContain('data-gallery="false"');
            },
        );

        test('should not add data-gallery-id when gallery-id is empty', () => {
            const html = transformYfm('![test](./test.png){gallery-id=}');

            expect(html).not.toContain('data-gallery-id');
        });

        test('should add data-gallery-id to inline SVG images', () => {
            const svgPath = resolve(dirname(mocksPath), 'test-gallery-id.svg');
            const svgContent =
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

            writeFileSync(svgPath, svgContent);

            const html = transformYfm('![test](./test-gallery-id.svg){inline=true gallery-id=42}');

            expect(html).toContain('data-gallery-id="42"');
            expect(html).toContain('data-gallery="true"');

            unlinkSync(svgPath);
        });
    });

    describe('gallery-src', () => {
        test('should convert gallery-src attribute into data-gallery-src', () => {
            const html = transformYfm('![test](./test.png){gallery-src=./gallery-item.png}');
            expect(html).toMatch(/data-gallery-src="[^"]*gallery-item\.png"/);
        });

        test('should resolve gallery-src as asset path, not leave raw markdown value untouched', () => {
            const html = transformYfm(
                '![test](./test.png){gallery-src=./gallery-item-resolved.png}',
            );

            expect(html).toMatch(/data-gallery-src="[^"]*gallery-item-resolved\.png"/);
        });

        test('should not fail and should keep attribute when gallery-src points to a non-existent file', () => {
            expect(() =>
                transformYfm('![test](./test.png){gallery-src=./missing-gallery-item.png}'),
            ).not.toThrow();

            const html = transformYfm(
                '![test](./test.png){gallery-src=./missing-gallery-item.png}',
            );
            expect(html).toMatch(/data-gallery-src="[^"]*missing-gallery-item\.png"/);
        });

        test('should not add data-gallery-src attribute when gallery-src value is empty', () => {
            const html = transformYfm('![test](./test.png){gallery-src=}');
            expect(html).not.toContain('data-gallery-src');
        });

        test('should support gallery-src together with gallery=true', () => {
            const html = transformYfm(
                '![test](./test.png){gallery=true gallery-src=./gallery-item2.png}',
            );

            expect(html).toContain('data-gallery="true"');
            expect(html).toMatch(/data-gallery-src="[^"]*gallery-item2\.png"/);
        });

        test('should support gallery-src together with data-gallery=false', () => {
            const html = transformYfm(
                '![test](./test.png){data-gallery=false gallery-src=./gallery-item3.png}',
            );

            expect(html).toContain('data-gallery="false"');
            expect(html).toMatch(/data-gallery-src="[^"]*gallery-item3\.png"/);
        });

        test('should handle gallery-src for inline SVG images', () => {
            const svgPath = resolve(dirname(mocksPath), 'test-gallery.svg');
            const svgContent =
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

            writeFileSync(svgPath, svgContent);

            const html = transformYfm(
                '![test](./test-gallery.svg){inline=true gallery-src=./gallery-item4.png}',
            );

            expect(html).toMatch(/data-gallery-src="[^"]*gallery-item4\.png"/);

            unlinkSync(svgPath);
        });

        test('should not add gallery-src attribute when not set in md attribute', () => {
            const html = transformYfm('![test](./test.png)');
            expect(html).not.toContain('data-gallery-src');
        });
    });
});
