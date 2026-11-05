import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import transform from '../../src/transform';
import table from '../../src/transform/plugins/table';
import {migrateTableAlignment} from '../../src/transform/migrations/table-alignment';

const render = (source: string) => new MarkdownIt().use(table).render(source);
const first = '#|\n|| Press ` key | b ||\n|| c | d ||\n|#';

describe('table inline-code recovery boundary', () => {
    it.each(['Use `code` here.', '## Heading `code`', '#|\n|| `a` | b ||\n|| c | d ||\n|#'])(
        'does not consume following independent content: %s',
        (later) => {
            expect(render(`${first}\n\n${later}`)).toBe(render(first) + render(later));
        },
    );

    it('applies the same boundary to alignment migration', () => {
        const later = '#|\n|| `a` {.cell-align-center} ||\n|#';
        const expected = migrateTableAlignment(later);
        const actual = migrateTableAlignment(`${first}\n\n${later}`);
        expect(actual.output).toBe(`${first}\n\n${expected.output}`);
        expect(actual.edits).toHaveLength(expected.edits.length);
    });
});

const wrap = (body: string) => `#|\n|| ${body} ||\n|#`;

describe('bounded code grammar goldens', () => {
    it.each(['`', '``'])('recovers unmatched %s with later matching runs', (run) => {
        const source = wrap(`Press ${run} key | b`);
        const later = `Use ${run}code${run} here.`;
        expect(render(`${source}\n\n${later}`)).toBe(render(source) + render(later));
    });

    it.each([
        'code `before\nafter|inside` tail',
        'code ``before ` short\nafter|inside`` tail',
        'a `unclosed | b ||\n|| c `later | d',
        'code `#| and |#` tail',
        'code ``before `|#` after`` tail',
        'escaped \\`before|after` tail',
        'escaped \\| content',
    ])('renders the intentional inline grammar: %s', (body) => {
        expect(render(wrap(body))).toMatchSnapshot();
    });

    it('gives a structural closer priority over ambiguous multiline code', () => {
        const source = '#|\n|| before `code\n|#\nafter` ||\n|#';
        expect(render(source)).toMatchSnapshot();
        expect(render(source)).not.toContain('<code>code |# after</code>');
    });

    it('keeps nested tables and multiline code on either side', () => {
        const source = wrap(
            '`before\ninside|code`\n\n#|\n|| `#| |#` | nested ||\n|#\n\n`after\ninside|code`',
        );
        expect(render(source)).toMatchSnapshot();
        expect(render(source).match(/<table>/g)).toHaveLength(2);
        expect(render(source)).toContain('<code>before inside|code</code>');
        expect(render(source)).toContain('<code>after inside|code</code>');
    });

    it.each([
        ['fenced code', 'before\n\n```\n|#\n#|\n```\n\nafter `x|y`', {}],
        ['block math', '$$\n|#\n#|\n$$\n\n`x|y`', {table_ignoreSplittersInBlockMath: true}],
        ['inline math', '$a|#b$ `x|y`', {table_ignoreSplittersInInlineMath: true}],
        ['Liquid', '{{ value |# #| }} `x|y`', {}],
        ['escaped table marker', 'before \\|#\nafter `code`', {}],
    ])('retains the existing %s shield or marker interpretation', (_name, body, options) => {
        const source = wrap(body as string);
        const parser = new MarkdownIt().use(table, options);
        expect(parser.render(source)).toMatchSnapshot();
    });
});

it.each([
    '#|\n|:{data-label="|#"}\n|| `a|b` ||\n|#',
    '#|\n||:{data-label="|#"} `a|b` ||\n|#',
    '#|\n||::{data-label="|#"} `a|b` ||\n|#',
    '#|\n|| first |::{data-label="#|"} `a|b` ||\n|#',
])('preserves delimiter-looking text in actual table attributes: %s', (source) => {
    expect(render(source)).toContain('<code>a|b</code>');
});

it.each(['> ', '  '])('preserves multiline code in container prefix %j', (prefix) => {
    const source = wrap('code `before\nafter|inside`|neighbor')
        .split('\n')
        .map((line) => prefix + line)
        .join('\n');
    const document = prefix === '  ' ? `- Item\n\n${source}` : source;
    expect(render(document)).toContain('<code>before after|inside</code>');
    expect(render(document)).toContain('<p>neighbor</p>');
    expect(render(document).match(/<td>/g)).toHaveLength(2);
});

it.each([
    {plugins: [table]},
    {pluginConfiguration: {preset: 'none' as const, enable: ['table' as const]}},
    {table_ignoreSplittersInInlineCode: true},
    {table_ignoreSplittersInInlineCode: false},
])('applies bounded recovery through runtime configuration %j', (options) => {
    const later = 'Use `code` here.';
    const compile = (source: string) =>
        transform(source, {...options, generateID: () => 'table-code'}).result.html;
    expect(compile(`${first}\n${later}`)).toBe(compile(first) + compile(later));
});
