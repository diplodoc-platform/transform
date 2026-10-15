import type * as Svgo from 'svgo' with {'resolution-mode': 'import'};

import {createRequire} from 'node:module';

import {replaceSvgContent} from '../src/transform/plugins/images';

const {optimize} = createRequire(__filename)('svgo') as typeof Svgo;

// Numeric references are counted by SAX; predefined XML entities such as &amp; are not.
const svgWithEntities = (count: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" content="${'&#10;'.repeat(count)}" viewBox="0 0 10 10"><path id="line" d="M0 0h10"/></svg>`;

const constantID = () => 'svg-test';
const imageOptions = {width: '', height: '', title: ''};

describe('SVG entity expansion', () => {
    test('renders draw.io-style metadata exceeding the default parser limit', () => {
        const output = replaceSvgContent(svgWithEntities(800), imageOptions, constantID);

        expect(output).toContain('<svg');
        expect(output).toContain('viewBox="0 0 10 10"');
        expect(output).toContain('id="svg-test__line"');
    });

    test('keeps a finite expansion limit', () => {
        // Keep individual attributes below SAX's independent 64 KiB buffer guard.
        const groups = Array.from(
            {length: 201},
            () => `<g content="${'&#10;'.repeat(500)}"/>`,
        ).join('');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg">${groups}</svg>`;

        expect(() => replaceSvgContent(svg, imageOptions, constantID)).toThrow(
            'Parsed entity count exceeds max entity count',
        );
    });

    test('does not change the parser default for other callers', () => {
        replaceSvgContent(svgWithEntities(800), imageOptions, constantID);

        expect(() => optimize(svgWithEntities(800))).toThrow(
            'Parsed entity count exceeds max entity count',
        );
        expect(() => optimize(svgWithEntities(2), {maxEntityCount: 1})).toThrow(
            'Parsed entity count exceeds max entity count',
        );
        expect(() =>
            replaceSvgContent(svgWithEntities(800), imageOptions, constantID),
        ).not.toThrow();
    });
});
