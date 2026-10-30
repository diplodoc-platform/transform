import {describe, expect, it} from 'vitest';

import {
    includedPathKey,
    includedSourceRanges,
    isIncludedEnd,
} from '../src/transform/preprocessors/included/boundaries';

describe('generated included-cache protection', () => {
    it('shares path-chain and whitespace recognition with the preprocessor', () => {
        expect(includedPathKey('  {% included (parent.md:child.md) %}\r')).toBe(
            'parent.md:child.md',
        );
        expect(includedPathKey('{% include [Child](child.md) %}')).toBeUndefined();
        expect(includedPathKey('{% included () %}')).toBeUndefined();
        expect(includedPathKey(undefined)).toBeUndefined();
        expect(isIncludedEnd('  {% endincluded %}\r')).toBe(true);
        expect(isIncludedEnd('{% endincluded %} trailing')).toBe(false);
    });

    it('protects nested cache bodies and keeps independent authored source outside', () => {
        const source = [
            'Authored',
            '{% included (parent.md) %}',
            '{% note info %}',
            '{% included (parent.md:child.md) %}',
            'Generated child',
            '{% endincluded %}',
            '{% endnote %}',
            '{% endincluded %}',
            'Authored again',
        ].join('\n');
        expect(includedSourceRanges(source)).toEqual([
            {startLine: 1, endLine: 8, closed: true},
            {startLine: 3, endLine: 6, closed: true},
        ]);
    });

    it('protects an unclosed cache through EOF and ignores a stray close', () => {
        expect(includedSourceRanges('{% endincluded %}\n{% included (child.md) %}\nBody')).toEqual([
            {startLine: 1, endLine: 3, closed: false},
        ]);
    });

    it('follows raw-line ownership inside code instead of inventing Markdown semantics', () => {
        expect(
            includedSourceRanges('```md\n{% included (child.md) %}\nBody\n{% endincluded %}\n```'),
        ).toEqual([{startLine: 1, endLine: 4, closed: true}]);
    });
});
