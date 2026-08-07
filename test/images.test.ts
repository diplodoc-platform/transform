import {dirname, resolve} from 'path';
import {unlinkSync, writeFileSync} from 'fs';
import {load} from 'cheerio';
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

        const html1 = transformYfm('![test](./test.svg){width=50 height=50% inline=true}');
        expect(html1).toContain('width="50"');
        expect(html1).toContain('height="50%"');

        const html2 = transformYfm(
            '![test](./test.svg){width=\'100vmax" onload="alert(1)\' height=\'100" onload="alert(1)\' inline=true}',
        );
        expect(html2).not.toContain('onload="alert(1)"');
        expect(html2).not.toContain('width="');

        const html3 = transformYfm(
            '![test](./test.svg){inline=true width=\'100vmax" onload="alert(1)\' height=\'100" onload="alert(1)\'}',
        );
        expect(html3).not.toContain('onload="alert(1)"');
        expect(html3).not.toContain('width="');

        unlinkSync(imagePath);
    });

    test('should add title tag to inline SVG when title attribute is provided', () => {
        const imagePath = resolve(dirname(mocksPath), 'test-title.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![test](./test-title.svg){title="My SVG Title" inline=true}');

        expect(html).toContain('<title>My SVG Title</title>');
        expect(html).toContain('<svg');

        unlinkSync(imagePath);
    });

    test('should not add title tag to inline SVG when it already exists', () => {
        const imagePath = resolve(dirname(mocksPath), 'test-existing-title.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>Existing Title</title><circle cx="50" cy="50" r="40" fill="red" /></svg>';

        writeFileSync(imagePath, svgContent);

        const html = transformYfm(
            '![test](./test-existing-title.svg){title="New Title" inline=true}',
        );

        expect(html).toContain('<title>Existing Title</title>');
        expect(html).not.toContain('<title>New Title</title>');

        unlinkSync(imagePath);
    });

    test('should not add title tag to inline SVG when title attribute is not provided', () => {
        const imagePath = resolve(dirname(mocksPath), 'test-no-title.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![test](./test-no-title.svg){inline=true}');

        expect(html).not.toContain('<title>');

        unlinkSync(imagePath);
    });

    test('should add title tag to inline SVG when title is provided in markdown syntax', () => {
        const imagePath = resolve(dirname(mocksPath), 'test-md-title.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![test](./test-md-title.svg "My SVG Title"){inline=true}');

        expect(html).toContain('<title>My SVG Title</title>');
        expect(html).toContain('<svg');

        unlinkSync(imagePath);
    });

    test('should not add title tag to inline SVG when only alt text is provided', () => {
        const imagePath = resolve(dirname(mocksPath), 'test-alt-only.svg');
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![My SVG Title](./test-alt-only.svg){inline=true}');

        expect(html).not.toContain('<title>');

        unlinkSync(imagePath);
    });

    test('should escape asterisks in SVG text nodes for markdown embedding', () => {
        const svgContent =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="0" y="10">SAI_POLICER_STAT_*</text><text x="0" y="20">*_PPS</text></svg>';

        const inlined = images.replaceSvgContent(svgContent, {
            width: undefined,
            height: undefined,
            title: undefined,
            dataAttrs: {},
        });

        expect(inlined).toContain('SAI_POLICER_STAT_&#42;');
        expect(inlined).toContain('&#42;_PPS');

        const md = new MarkdownIt({html: true});
        const rendered = md.render(inlined);

        expect(rendered).not.toContain('<em>');
        expect(rendered).toContain('SAI_POLICER_STAT_');
        expect(rendered).toContain('_PPS');
    });

    test('should remove XML processing instructions from inline SVG', () => {
        const imagePath = resolve(dirname(mocksPath), 'test-pi.svg');
        const svgContent =
            '<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet href="theme?dark"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><?plantuml source?version?><circle cx="50" cy="50" r="40" fill="red" /><?plantuml-src abc123?></svg>';

        writeFileSync(imagePath, svgContent);

        const html = transformYfm('![test](./test-pi.svg){inline=true}');

        expect(html).not.toContain('<?xml');
        expect(html).not.toContain('xml-stylesheet');
        expect(html).not.toContain('<?plantuml');
        expect(html).not.toContain('<?plantuml-src');
        expect(html).toContain('<circle');

        unlinkSync(imagePath);
    });

    test('should remove the preamble before an inline SVG', () => {
        const svgContent = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<!--Do not edit this file with editors other than draw.io-->',
            '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
            '<svg xmlns="http://www.w3.org/2000/svg" content="&lt;mxfile&gt;&#xa;&lt;/mxfile&gt;"><g><path d="M0 0h10v10z" /></g></svg>',
        ].join('\n');

        const inlined = images.replaceSvgContent(svgContent, {
            width: undefined,
            height: undefined,
            title: undefined,
            dataAttrs: {},
        });

        expect(inlined).toMatch(/^<svg\b/);
        expect(inlined).not.toContain('<?xml');
        expect(inlined).not.toContain('Do not edit this file');
        expect(inlined).not.toContain('<!DOCTYPE');
        expect(inlined).toContain('\n');

        const rendered = new MarkdownIt({html: true}).render(inlined);
        const document = load(rendered);

        expect(document('svg > g')).toHaveLength(1);
        expect(document('body > g')).toHaveLength(0);
    });

    test('should ignore svg-like text inside preamble comments', () => {
        const svgContent = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<!-- generated from an <svg> source -->',
            '<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>',
        ].join('\n');

        const inlined = images.replaceSvgContent(svgContent, {
            width: undefined,
            height: undefined,
            title: undefined,
            dataAttrs: {},
        });
        const document = load(inlined);

        expect(inlined).toMatch(/^<svg\b/);
        expect(inlined).not.toContain('generated from');
        expect(document('svg > circle')).toHaveLength(1);
    });

    test('should remove a DOCTYPE with an internal subset', () => {
        const svgContent = [
            '<!DOCTYPE svg [',
            '  <!ENTITY label "a]b">',
            ']>',
            '<svg xmlns="http://www.w3.org/2000/svg"><text>&label;</text></svg>',
        ].join('\n');

        const inlined = images.replaceSvgContent(svgContent, {
            width: undefined,
            height: undefined,
            title: undefined,
            dataAttrs: {},
        });

        expect(inlined).toMatch(/^<svg\b/);
        expect(inlined).not.toContain('<!DOCTYPE');
        expect(inlined).toContain('<text>a]b</text>');
    });

    test('should remove the CLI marker before rendering an already inlined SVG', () => {
        const {result} = transform(
            '<!-- diplodoc:svg ![SVG](../image.svg) --><svg width="100"><circle/></svg> — description',
            {allowHTML: true, needToSanitizeHtml: false},
        );

        expect(result.html).toBe('<p><svg width="100"><circle/></svg> — description</p>\n');
        expect(result.html).not.toContain('diplodoc:svg');
    });

    test('should transform a markdown link following an already inlined SVG', () => {
        const {result} = transform(
            '<!-- diplodoc:svg ![SVG](../image.svg) --><svg width="100"><circle/></svg> — [link](../link.md)',
            {allowHTML: true, needToSanitizeHtml: false},
        );

        expect(result.html).toBe(
            '<p><svg width="100"><circle/></svg> — <a href="../link.md">link</a></p>\n',
        );
        expect(result.html).not.toContain('diplodoc:svg');
    });

    test('should transform terms following inline SVGs inside styled strong text', () => {
        const input = [
            '- Презентация/продвижение продукта на разных **<!-- diplodoc:svg ![i](./_images/camera.svg) --><svg width="24"><circle/></svg> [конференциях](*conference)**{.photo} и **<!-- diplodoc:svg ![i](./_images/camera.svg) --><svg width="24"><circle/></svg> [митапах](*meetup)**{.photo}.',
            '',
            '[*conference]: Отраслевое мероприятие.',
            '',
            '[*meetup]: Неформальная встреча.',
        ].join('\n');
        const {result} = transform(input, {allowHTML: true, needToSanitizeHtml: false});

        expect(result.html).toContain(
            '<strong class="photo"><svg width="24"><circle/></svg> <i class="yfm yfm-term_title" term-key=":conference"',
        );
        expect(result.html).toContain(
            '<strong class="photo"><svg width="24"><circle/></svg> <i class="yfm yfm-term_title" term-key=":meetup"',
        );
        expect(result.html).not.toContain('[конференциях](*conference)');
        expect(result.html).not.toContain('[митапах](*meetup)');
        expect(result.html).not.toContain('diplodoc:svg');
    });

    test.each([
        [
            'backtick fenced code',
            ['```', '<!-- diplodoc:svg ![SVG](image.svg) --><svg/>', '```'].join('\n'),
        ],
        [
            'tilde fenced code',
            ['~~~', '<!-- diplodoc:svg ![SVG](image.svg) --><svg/>', '~~~'].join('\n'),
        ],
        [
            'fenced code inside a blockquote',
            ['> ```', '> <!-- diplodoc:svg ![SVG](image.svg) --><svg/>', '> ```'].join('\n'),
        ],
        [
            'fenced code inside a list',
            ['- ```', '  <!-- diplodoc:svg ![SVG](image.svg) --><svg/>', '  ```'].join('\n'),
        ],
        ['indented code', '    <!-- diplodoc:svg ![SVG](image.svg) --><svg/>'],
        ['inline code', '`<!-- diplodoc:svg ![SVG](image.svg) --><svg/>`'],
        ['multi-backtick inline code', '``<!-- diplodoc:svg ![SVG](image.svg) --><svg/>``'],
        [
            'inline code after an escaped backslash',
            '\\\\`<!-- diplodoc:svg ![SVG](image.svg) --><svg/>`',
        ],
    ])('should preserve the CLI marker inside %s', (_name, input) => {
        const {result} = transform(input, {allowHTML: true, needToSanitizeHtml: false});

        expect(result.html).toContain('diplodoc:svg');
    });

    test('should not treat escaped backticks as inline code delimiters', () => {
        const input = '\\`<!-- diplodoc:svg ![SVG](image.svg) --><svg/>\\`';
        const {result} = transform(input, {allowHTML: true, needToSanitizeHtml: false});

        expect(result.html).not.toContain('diplodoc:svg');
    });

    test('should remove the CLI marker from raw title and heading data', () => {
        const marker = '<!-- diplodoc:svg ![SVG](image.svg) --><svg><circle/></svg>';
        const input = [`# Title ${marker}`, '', `## ${marker}`].join('\n');
        const {result} = transform(input, {
            allowHTML: true,
            needToSanitizeHtml: false,
            needTitle: true,
        });

        expect(result.title).toBe('Title <svg><circle/></svg>');
        expect(JSON.stringify(result.headings)).not.toContain('diplodoc:svg');
        expect(result.html).not.toContain('diplodoc:svg');
    });

    test('should remove only markers outside code', () => {
        const marker = '<!-- diplodoc:svg ![SVG](image.svg) --><svg/>';
        const input = ['```', marker, '```', '', `Text ${marker}`].join('\n');
        const {result} = transform(input, {allowHTML: true, needToSanitizeHtml: false});

        expect(result.html.match(/diplodoc:svg/g)).toHaveLength(1);
    });
});
