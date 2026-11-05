import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import table from '../../src/transform/plugins/table';
import {migrateTableAlignment} from '../../src/transform/migrations/table-alignment';

const wrap = (body: string) => `#|\n|| ${body} ||\n|#`;
const render = (source: string) => new MarkdownIt().use(table).render(source);
const rowCount = (html: string) => html.match(/<tr>/g)?.length ?? 0;
const splitBody = 'a `unclosed\n\n| b ||\n|| c `later | d';

describe('native paragraph boundaries in table inline code', () => {
    it.each([
        [splitBody, 2],
        ['a `unclosed\n| b ||\n|| c `later | d', 1],
        ['A | text`\n\nExample: `x`\n||\n|| B | `y`', 2],
        ['A | text`\nExample: `x`\n||\n|| B | `y`', 1],
        ['A | `before\nafter|inside` ||\n|| B | `y`', 2],
    ])('preserves the native paragraph boundary for %j', (body, rows) => {
        expect(rowCount(render(wrap(String(body))))).toBe(rows);
    });

    it('keeps both authored rows in the Chinese regexp table excerpt', () => {
        const source = readFileSync(join(__dirname, 'fixtures/paragraph-boundary-zh.txt'), 'utf8');
        const html = render(source);
        expect(rowCount(html)).toBe(2);
        expect(html).toContain('\\Q...\\E');
        expect(html).not.toContain('<p>||');
    });

    it.each(['', ' ', '\t', ' \t '])('ends a paragraph at ASCII blank line %j', (padding) => {
        expect(rowCount(render(wrap(splitBody.replace('\n\n', '\n' + padding + '\n'))))).toBe(2);
    });

    it.each(['\u00a0', '\u2003'])('does not treat Unicode-only line %j as empty', (padding) => {
        expect(rowCount(render(wrap(splitBody.replace('\n\n', '\n' + padding + '\n'))))).toBe(1);
    });

    it.each(['> ', '  '])('uses shifted native line bounds inside container %j', (prefix) => {
        const source = wrap(splitBody)
            .split('\n')
            .map((line) => prefix + line)
            .join('\n');
        expect(rowCount(render(prefix === '  ' ? '- Item\n\n' + source : source))).toBe(2);
    });

    it('retains CRLF normalization and following independent content', () => {
        const source = wrap(splitBody).replace(/\n/g, '\r\n');
        expect(render(source)).toBe(render(wrap(splitBody)));
        expect(render(source + '\r\nAfter `code`.')).toBe(render(source) + render('After `code`.'));
    });

    it.each([
        ['fence', '```\n`literal\n\n|# || #|\n```', {}],
        ['math', '$$\n`literal\n\n|# || #|\n$$', {table_ignoreSplittersInBlockMath: true}],
        ['Liquid', '{{ value `\n\n|# || #| }}', {}],
    ])('keeps blank lines inside existing %s shields opaque', (_name, body, options) => {
        const source = wrap(`A | before\n\n${body}\n\nafter ||\n|| B | last`);
        const html = new MarkdownIt().use(table, options).render(source);
        expect(rowCount(html)).toBe(2);
        expect(html.match(/<table>/g)).toHaveLength(1);
        expect(html).toContain('last');
    });

    it('uses the same paragraph boundary for alignment migration', () => {
        const source = wrap('a `unclosed\n\n| b ||\n|| c `later | d {.cell-align-center}');
        const result = migrateTableAlignment(source);
        expect(rowCount(render(result.output))).toBe(2);
        expect(result.edits).toHaveLength(2);
        expect(render(result.output).replace(' data-align="center"', '')).toBe(render(source));
    });
});
