import {createRequire} from 'node:module';
import {dirname} from 'node:path';

import transform from '../src/transform';
import images, {replaceSvgContent} from '../src/transform/plugins/images';
import {optimize} from '../src/transform/svgo';

type SaxParser = {
    onerror?: (error: Error) => void;
    write: (content: string) => SaxParser;
    close: () => SaxParser;
};
type SaxModule = {
    MAX_BUFFER_LENGTH: number;
    parser: (strict: boolean, options?: {maxBufferLength?: number}) => SaxParser;
};

const projectRequire = createRequire(__filename);
const sax = createRequire(projectRequire.resolve('svgo'))('sax') as SaxModule;
const svgWithMetadata = (length: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" content="${'x'.repeat(length)}&#10;" viewBox="0 0 10 10"><path id="line" d="M0 0h10"/></svg>`;

describe('SVG attribute buffers', () => {
    test.each([sax.MAX_BUFFER_LENGTH + 1024, 2 * 1024 * 1024])(
        'parses metadata longer than the SAX default (%i characters)',
        (length) => {
            const {data} = optimize(svgWithMetadata(length), {plugins: []});
            expect(data).toContain(`content="${'x'.repeat(length)}`);
            expect(data).toContain('<path id="line"');
        },
    );

    test('preserves inline SVG in both the HTML renderer and shared Markdown helper', () => {
        const svg = svgWithMetadata(sax.MAX_BUFFER_LENGTH + 1024);
        const {result, logs} = transform('![Diagram](diagram.svg){inline=true}', {
            plugins: [images],
            path: __filename,
            root: dirname(__filename),
            rawContent: () => svg,
            replaceImageSrc: () => '/diagram.svg',
            calcPath: () => '/diagram.svg',
            generateID: () => 'buffer-test',
        });
        expect(result.html).toContain('<svg');
        expect(result.html).toContain('id="buffer-test__line"');
        expect(logs.error).toEqual([]);
        expect(logs.warn).toEqual([]);
        expect(
            replaceSvgContent(svg, {width: '', height: '', title: ''}, () => 'buffer-test'),
        ).toContain('id="buffer-test__line"');
    });

    test('keeps the global SAX default unchanged after success and failure', () => {
        const limit = sax.MAX_BUFFER_LENGTH;
        optimize(svgWithMetadata(limit + 1024), {plugins: []});
        expect(sax.MAX_BUFFER_LENGTH).toBe(limit);
        expect(() => optimize('<svg><path></svg>')).toThrow();
        expect(sax.MAX_BUFFER_LENGTH).toBe(limit);
    });

    test('isolates buffer limits between interleaved SAX parsers', () => {
        const limit = sax.MAX_BUFFER_LENGTH;
        const large = sax.parser(true, {maxBufferLength: limit * 2});
        const ordinary = sax.parser(true);
        for (const parser of [large, ordinary]) {
            parser.onerror = (error) => {
                throw error;
            };
        }
        const chunk = `<svg content="${'x'.repeat(limit + 1024)}`;
        expect(() => large.write(chunk)).not.toThrow();
        expect(() => ordinary.write(chunk)).toThrow('Max buffer length exceeded: attribValue');
        expect(() => large.write('"/>').close()).not.toThrow();
        expect(sax.MAX_BUFFER_LENGTH).toBe(limit);
    });

    test('retains the entity depth guard', () => {
        const declarations = Array.from(
            {length: 7},
            (_, index) => `<!ENTITY e${index} "${index ? `&e${index - 1};` : 'a'}">`,
        ).join('');
        const svg = `<!DOCTYPE svg [${declarations}]><svg><text>&e6;</text></svg>`;
        expect(() => optimize(svg, {plugins: []})).toThrow(
            'Parsed entity depth exceeds max entity depth',
        );
    });
});
