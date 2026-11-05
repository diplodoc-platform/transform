import type {StateBlock} from '../../src/transform/typings';

import MarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';

import {getTableRowPositions} from '../../src/transform/plugins/table/positions';

function stateFor(src: string): StateBlock {
    const bMarks: number[] = [];
    const eMarks: number[] = [];
    let position = 0;
    for (const line of src.split('\n')) {
        bMarks.push(position);
        eMarks.push(position + line.length);
        position += line.length + 1;
    }
    return {
        src,
        bMarks,
        eMarks,
        tShift: bMarks.map(() => 0),
        lineMax: bMarks.length,
        md: new MarkdownIt(),
    } as unknown as StateBlock;
}

function scannedCharacters(source: string): number {
    const state = stateFor(source);
    const original = String.prototype.charCodeAt;
    let count = 0;
    const spy = vi.spyOn(String.prototype, 'charCodeAt').mockImplementation(function (
        this: string,
        position: number,
    ) {
        if (this === source) {
            count++;
        }
        return original.call(this, position);
    });
    try {
        getTableRowPositions(state, 0, source.length, 0);
    } finally {
        spy.mockRestore();
    }
    return count;
}

describe('bounded table scanner work', () => {
    it.each([
        '|| ordinary | text ||\n',
        '|| `code|span` | text ||\n',
        '|| ``code ` short\nspan|inside`` | text ||\n',
        '|| escaped \\` marker | text ||\n',
    ])('keeps character visits linear for %j', (row) => {
        const counts = [32, 64, 128].map((size) => {
            const source = `#|\n${row.repeat(size)}|#`;
            const count = scannedCharacters(source);
            expect(count).toBeLessThan(source.length * 40);
            return count;
        });
        expect(counts[1]).toBeLessThan(counts[0] * 2.05);
        expect(counts[2]).toBeLessThan(counts[1] * 2.05);
    });

    it('does not scan following document text to resolve an unmatched backtick', () => {
        const first = '#|\n|| Press ` key | text ||\n|#';
        const count = scannedCharacters(first);
        expect(scannedCharacters(`${first}\n\n${'paragraph `code`\n'.repeat(10000)}`)).toBe(count);
    });
});
