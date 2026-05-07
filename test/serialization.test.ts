import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import transform from '../src/transform';

describe('serialization api', () => {
    it('serializeLanding returns landing result', () => {
        const result = transform.serializeLanding('# Title\n\n## Section\n\nText', {
            needTitle: true,
        });

        expect(result.kind).toBe('landing');
        expect(result.title).toBe('Title');
        expect(result.headings).toEqual([
            {
                title: 'Section',
                href: '#section',
                level: 2,
            },
        ]);
        expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('serializePageConstructor returns normalized page-constructor result', () => {
        const md = new MarkdownIt();

        const result = transform.serializePageConstructor(
            `blocks:\n  - type: header-block\n    title: Test title`,
            {md},
        );

        expect(result.kind).toBe('page-constructor');
        expect(result.data.blocks).toHaveLength(1);
        expect(result.data.blocks[0]).toMatchObject({
            type: 'header-block',
            title: '<p>Test title</p>\n',
        });
    });

    it('existing transform api still renders html', () => {
        const result = transform('# Title\n\nText');

        expect(result.result.html).toContain('<h1');
        expect(result.result.html).toContain('Title');
    });
});
