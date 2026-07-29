import path from 'path';
import MarkdownIt from 'markdown-it';

import imsize from '../src/transform/plugins/imsize';
import {parseImageSize} from '../src/transform/plugins/imsize/helpers';

const generate = require('markdown-it-testgen');

describe('imsize', () => {
    const md = new MarkdownIt({
        html: true,
        linkify: false,
        typographer: false,
    }).use(imsize);

    generate(path.join(__dirname, 'data/imsize/imsize-fixtures.txt'), md);
});

describe('imsize with inlineStyling', () => {
    const md = new MarkdownIt({
        html: true,
        linkify: false,
        typographer: false,
    }).use(imsize, {enableInlineStyling: true});

    generate(path.join(__dirname, 'data/imsize/imsize-inlineSizeStyling-fixtures.txt'), md);
});

describe('imsize inline attributes {key=value}', () => {
    const md = new MarkdownIt({html: true, linkify: false, typographer: false}).use(imsize);

    test('sets width via {width=N}', () => {
        const result = md.render('![test](img.png){width=100}');
        expect(result).toContain('width="100"');
        expect(result).toContain('src="img.png"');
    });

    test('sets height via {height=N}', () => {
        const result = md.render('![test](img.png){height=200}');
        expect(result).toContain('height="200"');
    });

    test('sets width and height together', () => {
        const result = md.render('![test](img.png){width=300 height=400}');
        expect(result).toContain('width="300"');
        expect(result).toContain('height="400"');
    });

    test('sets inline attribute via {inline=true}', () => {
        const result = md.render('![test](img.png){inline=true}');
        expect(result).toContain('inline="true"');
    });

    test('sets gallery=true via inline attribute', () => {
        const result = md.render('![test](img.png){data-gallery=true}');
        expect(result).toContain('data-gallery="true"');
    });

    test('sets gallery=false via inline attribute', () => {
        const result = md.render('![test](img.png){data-gallery=false}');
        expect(result).toContain('data-gallery="false"');
    });

    test('invalid gallery value is ignored', () => {
        const result = md.render('![test](img.png){data-gallery=yes}');
        expect(result).not.toContain('data-gallery=');
    });

    test('single-quoted attribute value', () => {
        const result = md.render("![test](img.png){width='150'}");
        expect(result).toContain('width="150"');
    });

    test('double-quoted attribute value', () => {
        const result = md.render('![test](img.png){width="250"}');
        expect(result).toContain('width="250"');
    });

    test('inline attributes override =WxH size', () => {
        const result = md.render('![test](img.png =50x60){width=300 height=400}');
        expect(result).toContain('width="300"');
        expect(result).toContain('height="400"');
        expect(result).not.toContain('width="50"');
        expect(result).not.toContain('height="60"');
    });

    test('inline attribute width only does not override =WxH height', () => {
        const result = md.render('![test](img.png =50x60){width=300}');
        expect(result).toContain('width="300"');
        expect(result).toContain('height="60"');
    });

    test('unclosed brace is ignored, image still renders', () => {
        const result = md.render('![test](img.png){width=100');
        expect(result).toContain('<img');
        expect(result).not.toContain('width="100"');
    });

    test('empty braces produce no extra attributes', () => {
        const result = md.render('![test](img.png){}');
        expect(result).toContain('<img');
        expect(result).not.toContain('width');
        expect(result).not.toContain('height');
        expect(result).not.toContain('gallery');
    });

    test('all inline attributes combined', () => {
        const result = md.render(
            '![test](img.png){width=100 height=200 inline=true data-gallery=false}',
        );
        expect(result).toContain('width="100"');
        expect(result).toContain('height="200"');
        expect(result).toContain('inline="true"');
        expect(result).toContain('data-gallery="false"');
    });
});

describe('imsize inline attributes with enableInlineStyling', () => {
    const md = new MarkdownIt({html: true, linkify: false, typographer: false}).use(imsize, {
        enableInlineStyling: true,
    });

    test('width via {width=N} produces width: Npx style', () => {
        const result = md.render('![test](img.png){width=300}');
        expect(result).toContain('width="300"');
        expect(result).toContain('style="width: 300px;"');
    });

    test('height via {height=N} produces height: Npx style', () => {
        const result = md.render('![test](img.png){height=200}');
        expect(result).toContain('height="200"');
        expect(result).toContain('style="height: 200px;"');
    });

    test('both width and height produce aspect-ratio style', () => {
        const result = md.render('![test](img.png){width=400 height=200}');
        expect(result).toContain('width="400"');
        expect(result).toContain('height="200"');
        expect(result).toContain('aspect-ratio: 400 / 200');
        expect(result).toContain('height: auto');
    });

    test('percentage width produces width: N% style', () => {
        const result = md.render('![test](img.png){width=50%}');
        expect(result).toContain('style="width: 50%;"');
    });

    test('percentage width + pixel height produces two separate style values', () => {
        const result = md.render('![test](img.png){width=50% height=200}');
        expect(result).toContain('width: 50%');
        expect(result).toContain('height: 200px');
        expect(result).not.toContain('aspect-ratio');
    });
});

describe('parseImageSize helper', () => {
    test('parses both width and height', () => {
        const str = '=300x200';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(true);
        expect(result.width).toBe('300');
        expect(result.height).toBe('200');
    });

    test('parses width only (=300x)', () => {
        const str = '=300x';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(true);
        expect(result.width).toBe('300');
        expect(result.height).toBe('');
    });

    test('parses height only (=x200)', () => {
        const str = '=x200';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(true);
        expect(result.width).toBe('');
        expect(result.height).toBe('200');
    });

    test('parses percentage width (=50%x)', () => {
        const str = '=50%x';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(true);
        expect(result.width).toBe('50%');
        expect(result.height).toBe('');
    });

    test('parses percentage height (=x100%)', () => {
        const str = '=x100%';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(true);
        expect(result.height).toBe('100%');
    });

    test('parses both percentage dimensions (=50%x100%)', () => {
        const str = '=50%x100%';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(true);
        expect(result.width).toBe('50%');
        expect(result.height).toBe('100%');
    });

    test('returns ok=false when string does not start with =', () => {
        const str = '300x200';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(false);
    });

    test('returns ok=false when pos >= max', () => {
        const str = '=300x200';
        const result = parseImageSize(str, str.length, str.length);
        expect(result.ok).toBe(false);
    });

    test('returns ok=false for alphabetic dimensions (=abcxdef)', () => {
        const str = '=abcxdef';
        const result = parseImageSize(str, 0, str.length);
        expect(result.ok).toBe(false);
    });

    test('returns ok=false for empty string', () => {
        const result = parseImageSize('', 0, 0);
        expect(result.ok).toBe(false);
    });

    test('pos offset is respected', () => {
        const str = 'foo=100x200';
        const result = parseImageSize(str, 3, str.length);
        expect(result.ok).toBe(true);
        expect(result.width).toBe('100');
        expect(result.height).toBe('200');
    });
});

describe('imsize reference-style images', () => {
    const md = new MarkdownIt({html: true, linkify: false, typographer: false}).use(imsize);

    test('full reference resolves href', () => {
        const result = md.render('![alt][img]\n\n[img]: http://example.com/photo.png');
        expect(result).toContain('src="http://example.com/photo.png"');
        expect(result).toContain('alt="alt"');
    });

    test('full reference with title resolves title', () => {
        const result = md.render('![alt][img]\n\n[img]: http://example.com/photo.png "My photo"');
        expect(result).toContain('title="My photo"');
    });

    test('collapsed reference [img][]', () => {
        const result = md.render('![img][]\n\n[img]: http://example.com/photo.png');
        expect(result).toContain('src="http://example.com/photo.png"');
    });

    test('undefined reference is not rendered as image', () => {
        const result = md.render('![alt][nonexistent]');
        expect(result).not.toContain('<img');
    });
});

describe('imsize edge cases', () => {
    const md = new MarkdownIt({html: true, linkify: false, typographer: false}).use(imsize);

    test('empty alt text', () => {
        const result = md.render('![](img.png =100x200)');
        expect(result).toContain('alt=""');
        expect(result).toContain('width="100"');
        expect(result).toContain('height="200"');
    });

    test('image with no src renders', () => {
        const result = md.render('![test]()');
        expect(result).toContain('<img');
        expect(result).toContain('alt="test"');
    });

    test('two images with different sizes on one line', () => {
        const result = md.render('![a](a.png =10x20) ![b](b.png =30x40)');
        expect(result).toContain('src="a.png"');
        expect(result).toContain('width="10"');
        expect(result).toContain('height="20"');
        expect(result).toContain('src="b.png"');
        expect(result).toContain('width="30"');
        expect(result).toContain('height="40"');
    });

    test('image inside emphasis is parsed correctly', () => {
        const result = md.render('*![test](img.png =100x200)*');
        expect(result).toContain('<img');
        expect(result).toContain('width="100"');
        expect(result).toContain('height="200"');
        expect(result).toContain('<em>');
    });
});
