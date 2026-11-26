import type {Token} from 'markdown-it';

import {dirname} from 'node:path';
import {describe, expect, it} from 'vitest';

import transform from '../src/transform';
import includes from '../src/transform/plugins/includes';

const path = require.resolve('./mocks/link.md');
const marker = '{% include [part](./include.md) %}';
const options = {plugins: [includes], path, root: dirname(path), disableLiquid: true};
const padding = ['', ' ', '\u00a0', '\ufeff', '\u2003', '\u202f', '\u3000', '\n', '\u00a0\n\u00a0'];
const cases = padding.flatMap((value) => [value + marker, marker + value, value + marker + value]);

describe('include paragraph whitespace compatibility', () => {
    it.each(cases)('preserves markdown-it 13 include recognition for %j', (source) => {
        const expected = transform(marker, options).result.html;
        expect(transform(source, options).result.html).toBe(expected);
        expect(expected).toContain('<p>Content</p>');
    });

    it.each([
        `\t${marker}`,
        `    ${marker}`,
        `\u200b${marker}`,
        `${marker}\u200b`,
        `Before ${marker}`,
        `${marker} after`,
        `${marker}\nOther prose`,
        `~~~md\n\u00a0${marker}\n~~~`,
        `\`${marker}\``,
    ])('does not expand protected or non-marker content %j', (source) => {
        const html = transform(source, options).result.html;
        expect(html).not.toContain('<p>Content</p>');
        expect(html).toContain('include');
    });

    it('does not mutate the source paragraph or its source coordinates while matching', () => {
        const source = `# Heading\n\n\u00a0${marker}\u00a0`;
        let observed: Token[] = [];
        const result = transform(source, {
            ...options,
            plugins: [
                includes,
                (md) => {
                    md.core.ruler.before('includes', 'observe_source', (state) => {
                        if (state.src === source) observed = state.tokens.slice(-3);
                    });
                },
            ],
        });
        expect(result.result.html).toContain('<p>Content</p>');
        expect(observed[0].map).toEqual([2, 3]);
        expect(observed[1].map).toEqual([2, 3]);
        expect(observed[1].content).toBe(`\u00a0${marker}\u00a0`);
    });
});
