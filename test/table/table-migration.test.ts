import type {YfmTablePluginOptions} from '../../src/transform/plugins/table/types';
import type {MarkdownIt as MarkdownItParser} from '../../src/transform/typings';

import MarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';

import transform from '../../src/transform';
import table from '../../src/transform/plugins/table';
import {getLogger, log} from '../../src/transform/log';
import {migrateTableAlignment} from '../../src/transform/migrations/table-alignment';

const wrap = (cell: string) => `#|\n|| ${cell} ||\n|#`;
const render = (source: string, options: YfmTablePluginOptions = {}) =>
    new MarkdownIt().use(table, options).render(source);

describe('Transform 5 inline-code table default', () => {
    it('protects inline-code pipes by default and retains explicit false', () => {
        const source = wrap('`before|after`');
        expect(render(source)).toBe(render(source, {table_ignoreSplittersInInlineCode: true}));
        expect(render(source).match(/<td>/g)).toHaveLength(1);
        expect(render(source)).toContain('<code>before|after</code>');
        expect(
            render(source, {table_ignoreSplittersInInlineCode: false}).match(/<td>/g),
        ).toHaveLength(2);
        const options = {
            disableLiquid: true,
            pluginConfiguration: {options: {table: {table_ignoreSplittersInInlineCode: false}}},
        };
        expect(transform(source, options).result.html.match(/<td>/g)).toHaveLength(2);
    });

    it.each([
        ['code `before\nafter|inside` tail', 1, '<code>before after|inside</code>'],
        ['code ``before\nafter|inside`` tail', 1, '<code>before after|inside</code>'],
        ['code \\`before|after` tail', 2, 'code `before'],
        ['code `before\\|after` tail', 1, '<code>before\\|after</code>'],
        ['code `unmatched | tail', 2, 'code `unmatched'],
        ['code ``before ` short\nafter|inside`` tail', 2, 'code ``before ` short'],
        ['a `unclosed | b ||\n|| c `later | d', 2, '<code>unclosed | b || || c </code>'],
    ])('preserves baseline explicit-true semantics for %s', (body, count, fragment) => {
        const source = wrap(String(body));
        const output = render(source);
        expect(output).toBe(render(source, {table_ignoreSplittersInInlineCode: true}));
        expect(output.match(/<td>/g)).toHaveLength(Number(count));
        expect(output).toContain(fragment);
    });

    it('retains native multiline spans instead of imposing a physical-line boundary', () => {
        const body = 'code ``before\nafter|inside`` tail';
        expect(render(wrap(body))).toContain(new MarkdownIt().renderInline(body));
    });
});

describe('scoped table alignment warnings', () => {
    it.each([undefined, '', '   '])('renders legacy alignment with path %j', (path) => {
        log.clear();
        const warn = vi.fn();
        const result = transform(wrap('A {.cell-align-center}'), {
            disableLiquid: true,
            path,
            log: {warn, info() {}, error() {}},
        });
        expect(result.result.html).toContain('class="cell-align-center"');
        expect(result.result.html).toContain('A');
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toContain('TABLE_CELL_ALIGN_CLASS');
        expect(warn.mock.calls[0][0]).toContain('<input>:2:3');
        expect(result.logs.warn).toHaveLength(1);
    });

    it.each([
        ['', ' guide.md ', ' guide.md '],
        ['   ', 'guide.md', 'guide.md'],
        [' source.md ', 'guide.md', ' source.md '],
    ])('labels env path %j without changing source paths', (envPath, path, label) => {
        const warn = vi.fn();
        let readPath: (() => unknown) | undefined;
        const options = {
            disableLiquid: true,
            path,
            plugins: [
                (md: MarkdownItParser) => {
                    md.core.ruler.before('block', 'test_source_path', (state) => {
                        state.env.path = envPath;
                        readPath = () => state.env.path;
                    });
                },
                table,
            ],
            log: {warn, info() {}, error() {}},
        };
        const result = transform(wrap('A {.cell-align-center}'), options);
        expect(result.result.html).toContain('class="cell-align-center"');
        expect(result.result.html).toContain('A');
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toContain(`${label}:2:3`);
        expect(readPath?.()).toBe(envPath);
        expect(options.path).toBe(path);
    });

    it('identifies separate source cells and reaches caller and collected diagnostics', () => {
        const warn = vi.fn();
        const source = '#|\n|| A {.cell-align-center} | B {.cell-align-top-left} ||\n|#';
        for (let index = 0; index < 2; index++) {
            log.clear();
            const output = transform(source, {
                disableLiquid: true,
                plugins: [table],
                path: 'guide.md',
                log: {warn, info() {}, error() {}},
            });
            expect(
                output.logs.warn.filter((message) => message.includes('TABLE_CELL_ALIGN_CLASS')),
            ).toHaveLength(2);
            expect(output.result.html).toContain('class="cell-align-center"');
        }
        expect(warn).toHaveBeenCalledTimes(4);
        expect(warn.mock.calls[0][0]).toContain('guide.md:2:3');
        expect(warn.mock.calls[0][0]).toContain('Removal: version 6.0.0');
    });

    it('owns a direct-plugin scope and supports pathless calls', () => {
        const warn = vi.fn();
        const create = () =>
            new MarkdownIt().use(table, {log: getLogger({warn, info() {}, error() {}})});
        const md = create();
        md.render(wrap('A {.cell-align-center}'));
        md.render(wrap('A {.cell-align-center}'));
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toContain('<input>:2:3');
        create().render(wrap('A {.cell-align-center}'));
        expect(warn).toHaveBeenCalledTimes(2);
    });

    it('preserves legacy behavior under either policy and does not warn for modern syntax', () => {
        for (const mode of ['current', 'legacy'] as const) {
            const warn = vi.fn();
            transform(wrap('A {.cell-align-center}'), {
                disableLiquid: true,
                plugins: [table],
                compatibility: {TABLE_CELL_ALIGN_CLASS: mode},
                log: {warn, info() {}, error() {}},
            });
            expect(warn).toHaveBeenCalledOnce();
        }
        const warn = vi.fn();
        new MarkdownIt()
            .use(table, {log: getLogger({warn, info() {}, error() {}})})
            .render('#|\n||::{align="center"} A | B {.custom} ||\n|#');
        expect(warn).not.toHaveBeenCalled();
    });
});

describe('pure table alignment migration', () => {
    it.each(['top-left', 'top-center', 'top-right', 'center', 'bottom-left', 'bottom-right'])(
        'migrates %s with structural output parity and idempotent edits',
        (alignment) => {
            const source = wrap(`A {.cell-align-${alignment}}`);
            const result = migrateTableAlignment(source);
            expect(result.output).toBe(`#|\n||::{align="${alignment}"} A ||\n|#`);
            expect(result.edits).toHaveLength(2);
            expect(result.diagnostics).toEqual([]);
            for (const enableMarkdownAttrs of [false, true]) {
                const options = {disableLiquid: true, plugins: [table], enableMarkdownAttrs};
                const before = transform(source, options).result.html;
                const after = transform(result.output, options).result.html;
                expect(after.replace(/ data-align="[^"]*"/g, '')).toBe(before);
            }
            const again = migrateTableAlignment(result.output);
            expect(again).toEqual({output: result.output, edits: [], diagnostics: []});
        },
    );

    it('preserves CRLF, UTF-16 offsets, escapes, inline code, and untouched source bytes', () => {
        const source =
            '😀 heading\r\n\r\n#|\r\n|| `a|b` {.cell-align-center} | a\\|b {.cell-align-top-left} ||\r\n|#\r\n';
        const result = migrateTableAlignment(source);
        expect(result.diagnostics).toEqual([]);
        expect(result.output).toContain(
            '||::{align="center"} `a|b` |::{align="top-left"} a\\|b ||',
        );
        expect(result.output.split('\r\n')).toHaveLength(source.split('\r\n').length);
        let reconstructed = source;
        for (const edit of [...result.edits].reverse()) {
            reconstructed =
                reconstructed.slice(0, edit.start) +
                edit.replacement +
                reconstructed.slice(edit.end);
        }
        expect(reconstructed).toBe(result.output);
    });

    it('preserves multiple-backtick inline code', () => {
        const result = migrateTableAlignment(wrap('``a`|b`` {.cell-align-center}'));
        expect(result.output).toContain('||::{align="center"} ``a`|b`` ||');
        expect(result.diagnostics).toEqual([]);
    });

    it.each([
        ['A {.cell-align-center .custom}', 'mixed-attributes'],
        ['A {class="cell-align-center"}', 'mixed-attributes'],
        ['A {.cell-align-unknown}', 'unknown-alignment'],
        ['A\nB {.cell-align-center}', 'multiline-cell'],
        ['{.cell-align-center}', 'ambiguous-content'],
        ['> {.cell-align-center}', 'nested-or-spanning-table'],
        ['^ {.cell-align-center}', 'nested-or-spanning-table'],
        ['# Heading {.cell-align-center}', 'ambiguous-content'],
        ['[link](target.md) {.cell-align-center}', 'ambiguous-content'],
        ['<span>HTML</span> {.cell-align-center}', 'ambiguous-content'],
        ['unmatched `code {.cell-align-center}', 'ambiguous-content'],
        ['escaped \\{.cell-align-center}', 'ambiguous-content'],
    ])('leaves ambiguous %s untouched with a diagnostic', (body, reason) => {
        const source = wrap(body);
        const result = migrateTableAlignment(source, {path: 'guide.md'});
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics[0]).toMatchObject({reason, path: 'guide.md'});
        expect(result.diagnostics[0].line).toBe(body.includes('\n') ? 3 : 2);
    });

    it.each([
        ['::{align="top-left"}', 'conflicting-alignment'],
        ['::{align="center"}', 'existing-cell-attributes'],
        ['::{bg="red"}', 'existing-cell-attributes'],
        ['::{}', 'existing-cell-attributes'],
    ])('does not merge existing cell attributes %s', (prefix, reason) => {
        const source = `#|\n||${prefix} A {.cell-align-center} ||\n|#`;
        const result = migrateTableAlignment(source);
        expect(result.output).toBe(source);
        expect(result.diagnostics[0]?.reason).toBe(reason);
    });

    it.each([
        '#|\n|| A {.cell-align-center} | > ||\n|#',
        '#|\n|| A {.cell-align-center} ||\n|| ^ ||\n|#',
        '#|\n||\n\n#|\n|| A {.cell-align-center} ||\n|#\n\n||\n|#',
    ])('preserves nested tables and span semantics for %s', (source) => {
        const result = migrateTableAlignment(source);
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics.some(({reason}) => reason === 'nested-or-spanning-table')).toBe(
            true,
        );
    });

    it('leaves an unclosed table unchanged and can migrate a safe independent cell', () => {
        const unclosed = '#|\n|| A {.cell-align-center} ||';
        expect(migrateTableAlignment(unclosed).diagnostics[0]?.reason).toBe('unclosed-table');
        const source = '#|\n|| A {.cell-align-center} | B {.cell-align-center .custom} ||\n|#';
        const result = migrateTableAlignment(source);
        expect(result.output).toContain(
            '||::{align="center"} A | B {.cell-align-center .custom} ||',
        );
        expect(result.diagnostics[0]?.reason).toBe('mixed-attributes');
    });

    it('does not let indented-code masking hide a nested table in an actual cell', () => {
        const source =
            '#|\n|| A {.cell-align-center} |\n\n    #|\n    || inner ||\n    |#\n\n||\n|#';
        const tokens = new MarkdownIt().use(table).parse(source, {});
        expect(tokens.filter(({type}) => type === 'yfm_table_open')).toHaveLength(2);
        const before = JSON.parse(JSON.stringify(log.get()));
        const result = migrateTableAlignment(source);
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics[0]?.reason).toBe('nested-or-spanning-table');
        expect(log.get()).toEqual(before);
    });

    it.each(['', '\n', '\r\n'])('diagnoses an unfinished first row with ending %j', (ending) => {
        const source = '#|' + (ending || '\n') + '|| Text {.cell-align-center}' + ending;
        const result = migrateTableAlignment(source, {path: 'unfinished.md'});
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics).toHaveLength(1);
        expect(result.diagnostics[0]).toMatchObject({
            reason: 'unclosed-table',
            path: 'unfinished.md',
            line: 2,
        });
    });

    it('diagnoses a multiline final suffix followed by newline before the row delimiter', () => {
        const source = '#|\n||\nText {.cell-align-center}\n||\n|#';
        const result = migrateTableAlignment(source);
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics[0]).toMatchObject({reason: 'multiline-cell', line: 3});
    });

    it('does not invent a final suffix by masking a later code example in the same cell', () => {
        const source = '#|\n||\nText {.cell-align-center}\n\n```md\nexample\n```\n||\n|#';
        expect(migrateTableAlignment(source)).toEqual({output: source, edits: [], diagnostics: []});
    });

    it.each([
        `\`\`\`md\n${wrap('A {.cell-align-center}')}\n\`\`\``,
        wrap('A {.cell-align-center}')
            .split('\n')
            .map((line) => '    ' + line)
            .join('\n'),
        '#|\n||\n\n#|\n|| A {.cell-align-center} ||\n|#\n\n||\n|#'
            .split('\n')
            .map((line) => '    ' + line)
            .join('\n'),
        `<div>\n${wrap('A {.cell-align-center}')}\n</div>`,
        `\uFEFF---\ntitle: sample\nexample: |\n${wrap('A {.cell-align-center}')}\n...\ntext`,
        `---\n${wrap('A {.cell-align-center}')}`,
    ])('does not inspect protected code, HTML, or frontmatter %s', (source) => {
        expect(migrateTableAlignment(source)).toEqual({output: source, edits: [], diagnostics: []});
    });

    it('does not evaluate Liquid, read include targets, or mutate diagnostic logs', () => {
        log.clear();
        const source = wrap('{% include [missing](absent.md) %}') + '\n\n{{ unset }}';
        expect(migrateTableAlignment(source).output).toBe(source);
        expect(log.isEmpty()).toBe(true);
        log.warn('Existing caller diagnostic');
        const before = JSON.parse(JSON.stringify(log.get()));
        expect(migrateTableAlignment(wrap('A {.cell-align-center}')).edits).toHaveLength(2);
        expect(log.get()).toEqual(before);
    });
});
