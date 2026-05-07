import {describe, expect, it} from 'vitest';

import transform = require('./index');
import {serializeLanding} from './serialize';

describe('transform runtime serialization', () => {
    it('serializeLanding returns landing model without html rendering', () => {
        const input = '# Title\n\n## Section\n\nText';

        const result = serializeLanding(input, {needTitle: true});

        expect(result.kind).toBe('landing');
        expect(result.title).toBe('Title');
        expect(result.headings).toEqual([
            {
                title: 'Section',
                href: 'section',
                level: 2,
                items: [],
            },
        ]);
        expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('transform still returns html output through existing API', () => {
        const input = '# Title\n\nText';

        const result = transform(input);

        expect(result.result.html).toContain('<h1');
        expect(result.result.html).toContain('Title');
    });

    it('transform with tokens=true still returns tokens array', () => {
        const input = '# Title\n\nText';

        const result = transform(input, {tokens: true});

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });
});
