import type {LogConsumer} from '../src/transform/log';

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
const render = (svgMaxEntityCount?: number, svg = svgWithEntities(800), logger?: LogConsumer) =>
    transform('![Diagram](diagram.svg){inline=true}', {
        plugins: [images],
        path: __filename,
        root: dirname(__filename),
        rawContent: () => svg,
        replaceImageSrc: () => '/diagram.svg',
        calcPath: () => '/diagram.svg',
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
        expect(replaceSvgContent(svgWithEntities(800), imageOptions, constantID)).toBe('');
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
        expect(
            replaceSvgContent(
                svgWithEntities(800),
                {...imageOptions, svgMaxEntityCount: 799},
                constantID,
            ),
        ).toBe('');
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
            info = vi.fn();
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

    test('handles and warns about the entity limit in the shared helper', () => {
        const logger = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        expect(
            replaceSvgContent(
                svgWithEntities(800),
                {...imageOptions, log: logger, path: 'diagram.svg'},
                constantID,
            ),
        ).toBe('');
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('--svg-max-entity-count'));
    });

    test('warns once across repeated renders and direct helper calls with one logger', () => {
        const logger = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        render(undefined, svgWithEntities(800), logger);
        render(undefined, svgWithEntities(800), logger);
        const path = '/diagram.svg';
        replaceSvgContent(svgWithEntities(800), {...imageOptions, log: logger, path}, constantID);
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(log.get().warn).toHaveLength(1);
        replaceSvgContent(
            svgWithEntities(800),
            {...imageOptions, log: logger, path: 'other.svg'},
            constantID,
        );
        expect(logger.warn).toHaveBeenCalledTimes(2);
        const nextBuildLogger = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        replaceSvgContent(
            svgWithEntities(800),
            {...imageOptions, log: nextBuildLogger, path},
            constantID,
        );
        expect(nextBuildLogger.warn).toHaveBeenCalledOnce();
    });
});
