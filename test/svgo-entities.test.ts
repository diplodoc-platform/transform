import {dirname} from 'path';

import transform from '../src/transform';
import images, {replaceSvgContent} from '../src/transform/plugins/images';
import {optimize} from '../src/transform/svgo';

// Numeric references are counted by SAX; predefined XML entities such as &amp; are not.
const svgWithEntities = (count: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" content="${'&#10;'.repeat(count)}" viewBox="0 0 10 10"><path id="line" d="M0 0h10"/></svg>`;

const constantID = () => 'svg-test';
const imageOptions = {width: '', height: '', title: ''};
const entityError = 'Parsed entity count exceeds max entity count';
const render = (svgMaxEntityCount?: number) =>
    transform('![Diagram](diagram.svg){inline=true}', {
        plugins: [images],
        path: __filename,
        root: dirname(__filename),
        rawContent: () => svgWithEntities(800),
        generateID: constantID,
        ...(svgMaxEntityCount === undefined ? {} : {svgMaxEntityCount}),
    });

describe('SVG entity expansion', () => {
    test('retains the SVGO default when Transform config omits the limit', () => {
        expect(() => render()).toThrow(entityError);
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
        expect(() => render()).toThrow(entityError);
        expect(() => render(1)).toThrow(entityError);
        expect(() => optimize(svgWithEntities(800))).toThrow(entityError);
        expect(() => render(1024)).not.toThrow();
    });
});
