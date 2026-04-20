import {describe, expect, it} from 'vitest';
import {createIDGeneratorByStrategy} from '@diplodoc/utils';

import transform from '../src/transform';
import term from '../src/transform/plugins/term';
import code from '../src/transform/plugins/code';
import inlineCode from '../src/transform/plugins/inline-code';
import links from '../src/transform/plugins/links';

/**
 * Extract all id attribute values from an HTML string.
 *
 * @param html - HTML string to search
 * @returns Array of id attribute values found in the HTML
 */
function extractIds(html: string): string[] {
    const matches = html.matchAll(/\bid="([^"]+)"/g);
    return Array.from(matches, (m) => m[1]);
}

const transformWith = (text: string, plugins = [links, code, term, inlineCode]) => {
    const {
        result: {html},
    } = transform(text, {
        plugins,
        generateID: createIDGeneratorByStrategy('deterministic'),
    });
    return html;
};

describe('Per-file ID isolation', () => {
    describe('term plugin', () => {
        const termDoc = `
*[API]: Application Programming Interface

Use API here and API again.
`.trim();

        it('produces deterministic IDs (prefix-N format) for term references', () => {
            const html = transformWith(termDoc);
            const ids = extractIds(html);
            // All IDs should match the deterministic pattern, not random strings
            for (const id of ids) {
                expect(id).toMatch(/^.+-\d+$/);
            }
        });

        it('resets ID counter between two separate transform() calls', () => {
            const html1 = transformWith(termDoc);
            const html2 = transformWith(termDoc);

            const ids1 = extractIds(html1);
            const ids2 = extractIds(html2);

            // Both documents should produce identical ID sets
            expect(ids1).toEqual(ids2);
        });

        it('IDs in first file do not bleed into second file', () => {
            // First file has many term references to advance the counter
            const manyTerms = `
*[API]: Application Programming Interface

API API API API API
`.trim();

            const singleTerm = `
*[API]: Application Programming Interface

API
`.trim();

            const html1 = transformWith(manyTerms);
            const html2 = transformWith(singleTerm);
            const ids1 = extractIds(html1);
            const ids2 = extractIds(html2);

            // The second file should produce the same IDs as if it were the first file
            const htmlFirst = transformWith(singleTerm);
            const idsFirst = extractIds(htmlFirst);

            expect(ids2).toEqual(idsFirst);
            // IDs from the large first file should not appear in the second file
            const ids1Set = new Set(ids1);
            for (const id of ids2) {
                expect(ids1Set.has(id)).toBe(false);
            }
        });
    });

    describe('inline-code plugin', () => {
        const inlineCodeDoc = '`code1` and `code2` and `code3`';

        it('produces deterministic IDs for inline code spans', () => {
            const html = transformWith(inlineCodeDoc);
            const ids = extractIds(html);
            for (const id of ids) {
                expect(id).toMatch(/^.+-\d+$/);
            }
        });

        it('resets inline-code ID counter between transform() calls', () => {
            const html1 = transformWith(inlineCodeDoc);
            const html2 = transformWith(inlineCodeDoc);

            expect(extractIds(html1)).toEqual(extractIds(html2));
        });
    });
});
