import {dirname} from 'path';
import {vi} from 'vitest';

import transform from '../src/transform';
import images, {replaceSvgContent} from '../src/transform/plugins/images';
import {optimize} from '../src/transform/svgo';
import {log} from '../src/transform/log';

// Numeric references are counted by SAX; predefined XML entities such as &amp; are not.
const svgWithEntities = (count: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" content="${'&#10;'.repeat(count)}" viewBox="0 0 10 10"><path id="line" d="M0 0h10"/></svg>`;

const constantID = () => 'svg-test';
const imageOptions = {width: '', height: '', title: ''};
const entityError = 'Parsed entity count exceeds max entity count';
const render = (
    svgMaxEntityCount?: number,
    svg = svgWithEntities(800),
    logger?: Partial<typeof log>,
) =>
    transform('![Diagram](diagram.svg){inline=true}', {
        plugins: [images],
        path: __filename,
        root: dirname(__filename),
        rawContent: () => svg,
        replaceImageSrc: () => '/diagram.svg',
        log: logger,
        generateID: constantID,
        ...(svgMaxEntityCount === undefined ? {} : {svgMaxEntityCount}),
    });

describe('SVG entity expansion', () => {
    beforeEach(() => log.clear());
    test('retains the SVGO default when Transform config omits the limit', () => {
        const {
            result: {html},
            logs,
        } = render();
        expect(html).toContain('<img src="/diagram.svg"');
        expect(html).not.toContain('<svg');
        expect(logs.error).toEqual([]);
        expect(logs.warn.join(' ')).toContain('content.svgMaxEntityCount');
        expect(logs.warn.join(' ')).toContain('--svg-max-entity-count');
        expect(() => replaceSvgContent(svgWithEntities(800), imageOptions, constantID)).toThrow(
            entityError,
        );
    });

    test('forwards an explicit Transform limit when rendering SVG metadata', () => {
        const {
            result: {html},
        } = render(1024);
        expect(html).toContain('<svg');
        expect(html).toContain('viewBox="0 0 10 10"');
        expect(html).toContain('id="svg-test__line"');
    });

    test('honors the configured bound in the exported SVG helper', () => {
        expect(() =>
            replaceSvgContent(
                svgWithEntities(800),
                {...imageOptions, svgMaxEntityCount: 799},
                constantID,
            ),
        ).toThrow(entityError);
        expect(() =>
            replaceSvgContent(
                svgWithEntities(800),
                {...imageOptions, svgMaxEntityCount: 800},
                constantID,
            ),
        ).not.toThrow();
    });

    test('keeps explicit limits local to each call', () => {
        render(1024);
        expect(render().result.html).toContain('<img');
        expect(render(1).result.html).toContain('<img');
        expect(() => optimize(svgWithEntities(800))).toThrow(entityError);
        expect(() => render(1024)).not.toThrow();
    });
    test('reports the fallback through the caller logger', () => {
        const warn = vi.fn();
        const error = vi.fn();
        class Logger {
            warn(message: string) {
                warn(message);
            }
            error(message: string) {
                error(message);
            }
        }
        render(undefined, svgWithEntities(800), new Logger());
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('--svg-max-entity-count'));
        expect(error).not.toHaveBeenCalled();
    });

    test('does not hide other SVG parser errors', () => {
        expect(() => render(undefined, '<svg><path></svg>')).toThrow();
    });

    test('adds configuration guidance to entity limit errors from the helper', () => {
        expect(() => replaceSvgContent(svgWithEntities(800), imageOptions, constantID)).toThrow(
            '--svg-max-entity-count',
        );
    });
});
