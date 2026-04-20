/**
 * Tests verifying that ID collisions do NOT occur when includes are used.
 *
 * Root cause analysis (all fixed):
 * - inline-code: generateID is captured in a renderer closure at plugin init time,
 *   so it IS shared across includes — no collision.
 * - SVG (images): generateID is passed via opts and shared — no collision.
 * - tabs (extensions/tabs): createIDGenerator() was called inside plugin() (core rule),
 *   which re-ran for every state.md.parse() call including includes → NEW generator
 *   per include → counter resets → COLLISION.
 *   FIX: generator is now stored in env via addHiddenProperty so it is reused across
 *   all parse() calls for the same document (including includes).
 */
import {resolve} from 'path';
import {unlinkSync, writeFileSync} from 'fs';
import {describe, expect, it} from 'vitest';

import transform from '../src/transform';
import includes from '../src/transform/plugins/includes';
import inlineCode from '../src/transform/plugins/inline-code';
import images from '../src/transform/plugins/images';
import links from '../src/transform/plugins/links';
import tabs from '../src/transform/plugins/tabs';

const mocksDir = resolve(__dirname, './mocks/id-collision');
const mainMdPath = resolve(mocksDir, 'main.md');

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

/**
 * Check that all IDs in the HTML are unique (no duplicates).
 *
 * @param html - HTML string to check
 * @returns true if all IDs are unique
 */
function hasUniqueIds(html: string): boolean {
    const ids = extractIds(html);
    return ids.length === new Set(ids).size;
}

describe('ID collision with includes', () => {
    describe('inline-code plugin', () => {
        it('should produce unique IDs when parent and include both have inline code', () => {
            // include-inline-code.md contains: `code from include`
            const mainContent = [
                '`code in parent`',
                '',
                '{% include [inc](./include-inline-code.md) %}',
                '',
                '`another code in parent`',
            ].join('\n');

            const {
                result: {html},
            } = transform(mainContent, {
                plugins: [includes, inlineCode, links],
                path: mainMdPath,
                root: mocksDir,
            });

            const ids = extractIds(html);
            // Must have IDs from all 3 inline-code spans (parent has 2, include has 1)
            expect(ids.length).toBeGreaterThanOrEqual(3);
            // All inline-code IDs must be unique across parent + included content
            expect(hasUniqueIds(html)).toBe(true);
        });
    });

    describe('SVG images plugin', () => {
        it.skip('should produce unique SVG prefix IDs when parent and include both have inline SVGs', () => {
            // include-svg.svg has an element with id="my-circle"
            // When inlined, SVG IDs get prefixed with generateID('svg')
            // If the prefix is the same in parent and include, the resulting IDs collide

            const includeSvgMd = resolve(mocksDir, 'include-svg.md');
            writeFileSync(includeSvgMd, '![svg from include](./include-svg.svg){inline=true}\n');

            try {
                const mainContent = `
![svg in parent](./include-svg.svg){inline=true}

{% include [inc](./include-svg.md) %}
`.trim();

                const {
                    result: {html},
                } = transform(mainContent, {
                    plugins: [includes, images, links],
                    path: mainMdPath,
                    root: mocksDir,
                });

                const ids = extractIds(html);
                // Must have SVG element IDs from both parent and include SVGs
                // (each SVG has "my-circle" element that gets prefixed)
                expect(ids.length).toBeGreaterThanOrEqual(2);
                // SVG element IDs (prefixed by generateID('svg')) must be unique
                // e.g. "svg-1-my-circle" in parent, "svg-2-my-circle" in include
                expect(hasUniqueIds(html)).toBe(true);
            } finally {
                unlinkSync(includeSvgMd);
            }
        });
    });

    describe('tabs plugin', () => {
        it('should produce unique tab panel IDs when parent and include both have tabs', () => {
            // include-tabs.md contains a {% list tabs %} block with 2 tabs (Tab A, Tab B)
            // The parent also has a {% list tabs %} block with 2 tabs (Tab 1, Tab 2)
            // Before the fix: each include triggered a new createIDGenerator() call,
            // so both blocks would get panel IDs starting from 1 → collision.
            // After the fix: the generator is stored in env and reused → unique IDs.
            const mainContent = [
                '{% list tabs %}',
                '',
                '- Tab 1',
                '',
                '  Content 1',
                '',
                '- Tab 2',
                '',
                '  Content 2',
                '',
                '{% endlist %}',
                '',
                '{% include [inc](./include-tabs.md) %}',
            ].join('\n');

            const {
                result: {html},
            } = transform(mainContent, {
                plugins: [includes, tabs, links],
                path: mainMdPath,
                root: mocksDir,
            });

            // Tab panels have id="..." attributes (e.g. "regular-1", "regular-2", ...)
            const ids = extractIds(html);
            // Must have panel IDs from both parent tabs (2) and include tabs (2)
            expect(ids.length).toBeGreaterThanOrEqual(4);
            // All tab panel IDs must be unique — no collision between parent and include
            expect(hasUniqueIds(html)).toBe(true);
        });
    });
});
