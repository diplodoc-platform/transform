import type {Logger} from '../../src/transform/log';

import {load} from 'cheerio';
import MarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';
import {registerContainerDirective, tokenizeBlockContent} from '@diplodoc/directive';

import transform from '../../src/transform';
import tablePlugin from '../../src/transform/plugins/table';

const options = {pluginConfiguration: {options: {notes: {directiveSyntax: 'enabled' as const}}}};
const table = '#|\n|| ```\n:::\n``` ||\n|#';

function expectTableInsideNote(html: string): void {
    const $ = load(html);
    const note = $('.yfm-note-content');
    expect(note).toHaveLength(1);
    expect(note.find('table').text()).toContain(':::');
    expect(note.text()).not.toContain('AFTER');
    expect($.root().text()).toContain('AFTER');
}

describe('directive and YFM table boundaries', () => {
    it('keeps a fenced marker inside the table and the real close outside', () => {
        const source = `:::note {type=info}\n\n${table}\n\n:::\n\nAFTER`;
        const {html} = transform(source, options).result;
        expectTableInsideNote(html);
    });
    it('preserves the legacy table control', () => {
        const source = `{% note info %}\n\n${table}\n\n{% endnote %}\n\nAFTER`;
        expectTableInsideNote(transform(source, options).result.html);
    });
});

describe('table boundary variants', () => {
    it.each([
        ['adjacent closer', ':::note {type=info}\n\n#|\n|| ```\n:::\n``` ||\n|#\n:::\n\nAFTER'],
        [
            'nested table',
            ':::note {type=info}\n\n#|\n|| outer\n#|\n|| ```\n:::\n``` ||\n|#\n||\n|#\n\n:::\n\nAFTER',
        ],
        [
            'quoted note',
            '> :::note {type=info}\n>\n> #|\n> || ```\n> :::\n> ``` ||\n> |#\n>\n> :::\n\nAFTER',
        ],
    ])('renders %s', (_name, source) => {
        const {html} = transform(source, options).result;
        expectTableInsideNote(html);
    });
});

it.each([
    ['notes', 'table'],
    ['table', 'notes'],
] as const)(
    'supports notes and table when visibility is not selected (%s, %s)',
    (first, second) => {
        const source = `:::note {type=info}\n\n${table}\n\n:::\n\nAFTER`;
        const {html} = transform(source, {
            pluginConfiguration: {
                preset: 'none',
                enable: [first, second],
                options: {notes: {directiveSyntax: 'enabled'}},
            },
        }).result;
        expectTableInsideNote(html);
    },
);

it('keeps unregistered directives literal with the table-only preset', () => {
    const source = ':::unknown\nplain\n:::\n\n#|\n|| text ||\n|#';
    const {html} = transform(source, {
        pluginConfiguration: {preset: 'none', enable: ['table']},
    }).result;
    expect(html).toContain(':::unknown');
    expect(html).toContain('plain');
    expect(html).toContain('<table>');
});

it('does not run host block rules or log during boundary discovery', () => {
    const md = new MarkdownIt();
    const env = {probe: true};
    const log = {warn: vi.fn(), info: vi.fn(), error: vi.fn()};
    md.use(tablePlugin, {log: log as unknown as Logger});
    md.block.ruler.before('code', 'sentinel', (state) => {
        expect(state.env).toBe(env);
        return false;
    });
    registerContainerDirective(md, 'box', (state, params) => {
        tokenizeBlockContent(state, params.content);
        return true;
    });
    md.parse(':::box\n\n#|\n|:{header-rows="0"}\n|| ```\n:::\n``` ||\n|#\n\n:::\n', env);
    expect(log.warn).toHaveBeenCalledTimes(1);
});

it.each([
    [true, '#|\n|| ```\n|#\n:::\n``` ||\n|#\n'],
    [false, '#|\n|| ```\n|#\n'],
])('uses the configured table block-code option %s', (ignoreCode, expected) => {
    const md = new MarkdownIt();
    md.use(tablePlugin, {
        table_ignoreSplittersInBlockCode: ignoreCode,
        table_ignoreSplittersInInlineCode: ignoreCode,
    });
    let raw = '';
    registerContainerDirective(md, 'box', (_state, params) => {
        raw = params.content.raw;
        return true;
    });
    md.parse(':::box\n#|\n|| ```\n|#\n:::\n``` ||\n|#\n:::\n', {});
    expect(raw).toBe(expected);
});

it('does not hide a delimiter behind an unclosed table', () => {
    const md = new MarkdownIt().use(tablePlugin);
    let raw = '';
    registerContainerDirective(md, 'box', (_state, params) => {
        raw = params.content.raw;
        return true;
    });
    md.parse(':::box\n#|\n|| broken\n:::\nAFTER', {});
    expect(raw).toBe('#|\n|| broken\n');
});

it.each([
    [
        'list',
        '- :::note {type=info}\n\n  #|\n  || ```\n  :::\n  ``` ||\n  |#\n\n  #|\n  || second ||\n  |#\n\n  :::\n\nAFTER',
    ],
    [
        'quote',
        '> :::note {type=info}\n>\n> #|\n> || ```\n> :::\n> ``` ||\n> |#\n>\n> #|\n> || second ||\n> |#\n>\n> :::\n\nAFTER',
    ],
])('keeps repeated tables inside a note in a %s', (_scope, source) => {
    const html = transform(source, options).result.html;
    expect(html.match(/<table>/g)).toHaveLength(2);
    expect(html).toMatch(
        /yfm-note-content[\s\S]*<table>[\s\S]*<table>[\s\S]*<\/div><\/div>[\s\S]*AFTER/,
    );
});
