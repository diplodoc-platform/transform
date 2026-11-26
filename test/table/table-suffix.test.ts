import {describe, expect, it} from 'vitest';

import {
    alignmentSuffix,
    horizontalEnd,
    trailingClassBlock,
} from '../../src/transform/plugins/table/suffix';

// Retain the previous grammar as a differential oracle, including its quirks.
const oldClass = (source: string) => /\s*\{[^}]*}$/.exec(source)?.[0];
const oldAlignment = (source: string) => {
    const match = /[ \t]*\{([^{}\n]*cell-align-[^{}\n]*)\}[ \t\n]*$/.exec(source);
    return match ? {0: match[0], 1: match[1], index: match.index} : undefined;
};
const oldHorizontalEnd = (source: string) =>
    source.length - (/[ \t]*$/.exec(source)?.[0].length ?? 0);

function equivalent(source: string) {
    expect(trailingClassBlock(source), JSON.stringify(source)).toBe(oldClass(source));
    expect(alignmentSuffix(source), JSON.stringify(source)).toEqual(oldAlignment(source));
    expect(horizontalEnd(source), JSON.stringify(source)).toBe(oldHorizontalEnd(source));
}

describe('linear table attribute suffix scanners', () => {
    it('preserves generated combinations of braces, alignment markers and whitespace', () => {
        const parts = ['x', '{', '}', ' ', '\t', '\n', '\r', '\u2028', '\u00a0', 'cell-align-'];
        for (const first of parts) {
            for (const second of parts) {
                for (const third of parts) {
                    for (const fourth of parts) {
                        equivalent(first + second + third + fourth);
                    }
                }
            }
        }
    });

    it.each([
        'a {.cell-align-center}',
        'a {{.cell-align-center}',
        'a {bad} {.cell-align-center}\n',
        'a {cell-align-first cell-align-last}\t\n',
        'a {cell-align-\rcenter}\t',
        'a {cell-align-\ncenter}',
        'a {cell-align-} \r\n',
        'a {.custom .cell-align-center title="x"}',
        '\\{.cell-align-center}',
        ' '.repeat(8000) + 'x',
        '{'.repeat(8000) + 'x',
        '{'.repeat(8000) + 'cell-align-}',
    ])('retains exact prior suffix matching for %j', equivalent);
});
