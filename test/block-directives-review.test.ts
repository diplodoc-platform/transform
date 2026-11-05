import type {MarkdownIt as MarkdownItInstance} from '@diplodoc/tabs-extension/plugin';

import MarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';

import transform from '../src/transform';
import {migrateBlockDirectives} from '../src/transform/migrations/block-directives';

const cut = (body = 'Body') => `{% cut "Title" %}\n\n${body}\n\n{% endcut %}`;
const note = (body = 'Body') => `{% note info %}\n\n${body}\n\n{% endnote %}`;

describe('block directive review regressions', () => {
    it('bounds scope predicate work for adjacent colon Notes', () => {
        const measure = (size: number) => {
            let visits = 0;
            const some = Array.prototype.some;
            const find = Array.prototype.find;
            const count = (value: unknown) => {
                if (
                    value &&
                    typeof value === 'object' &&
                    'protected' in value &&
                    'start' in value &&
                    'end' in value &&
                    'name' in value
                )
                    visits++;
            };
            const someSpy = vi.spyOn(Array.prototype, 'some').mockImplementation(function (
                this: unknown[],
                callback,
                receiver,
            ) {
                return some.call(this, (value, index, array) => {
                    count(value);
                    return callback.call(receiver, value, index, array);
                });
            });
            const findSpy = vi.spyOn(Array.prototype, 'find').mockImplementation(function (
                this: unknown[],
                callback,
                receiver,
            ) {
                return find.call(this, (value, index, array) => {
                    count(value);
                    return callback.call(receiver, value, index, array);
                });
            });
            try {
                const prefix = Array.from(
                    {length: size},
                    () => ':::note {type=info}\n\nExisting\n\n:::',
                ).join('\n\n');
                const result = migrateBlockDirectives(prefix + '\n\n' + note());
                expect(result.diagnostics).toEqual([]);
                expect(result.edits).toHaveLength(2);
                return visits;
            } finally {
                someSpy.mockRestore();
                findSpy.mockRestore();
            }
        };
        const small = measure(32),
            large = measure(64);
        expect(large).toBeLessThanOrEqual(Math.max(128, small * 2.5));
    });
    it('migrates a sibling touching the end of a native Note scope', () => {
        const protectedText = ':::note {type=info}\n\nProtected\n\n:::\n';
        const result = migrateBlockDirectives(protectedText + note());
        expect(result.output.startsWith(protectedText)).toBe(true);
        expect(result.edits).toHaveLength(2);
        expect(result.diagnostics).toEqual([]);
    });
    it('migrates a legacy owner enclosing a complete protected native scope', () => {
        const body = ':::visibility\n\nProtected\n\n:::';
        const result = migrateBlockDirectives(note(body));
        expect(result.output).toBe(`:::note {type=info}\n\n${body}\n\n:::`);
        expect(result.edits).toHaveLength(2);
        expect(result.diagnostics).toEqual([]);
    });
    it('refuses a legacy owner crossing a protected native scope boundary', () => {
        const source = ':::visibility\n\n{% note info %}\n\nBody\n\n:::\n\n{% endnote %}';
        const result = migrateBlockDirectives(source);
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({reason: 'unsupported-or-protected-container'}),
        );
    });
    it.each([false, true])(
        'retains only groups preceding every unproved marker (leading=%s)',
        (leading) => {
            const before = note('Before');
            const middle = note('Middle');
            const after = note('After');
            const source =
                (leading ? ':::leading\n\n' : '') +
                `${before}\n\n:::unknown\n\n${middle}\n\n:::other\n\n${after}\n\n:::last`;
            const result = migrateBlockDirectives(source);
            expect(result.edits).toHaveLength(leading ? 0 : 2);
            expect(result.output).toBe(
                leading
                    ? source
                    : source
                          .replace('{% note info %}', ':::note {type=info}')
                          .replace('{% endnote %}', ':::'),
            );
            expect(result.diagnostics.map((item) => item.reason)).toEqual(
                Array(leading ? 4 : 3).fill('unproved-colon-scope'),
            );
            expect(result.diagnostics.map((item) => item.offset)).toEqual(
                [...source.matchAll(/^:::.*$/gm)].map((match) => match.index),
            );
        },
    );
    it.each(['# Heading\n\n', 'Intro\n\n', '\uFEFF😀\r\n\r\n'])(
        'migrates Cut after %j',
        (prefix) => {
            const result = migrateBlockDirectives(prefix + cut());
            expect(result.edits).toHaveLength(2);
            expect(result.diagnostics).toEqual([]);
            expect(migrateBlockDirectives(result.output).edits).toEqual([]);
        },
    );
    it('matches finalized Transform resources for adjacent Cuts', () => {
        const source = '# Heading\n\n' + cut() + '\n\n' + cut();
        const colon = source
            .split('{% cut "Title" %}')
            .join(':::cut [Title]')
            .split('{% endcut %}')
            .join(':::');
        const before = transform(source, {disableLiquid: true}).result;
        const after = transform(colon, {disableLiquid: true}).result;
        expect(after.meta).toEqual(before.meta);
        expect(migrateBlockDirectives(source).edits).toHaveLength(4);
    });
    it('retains ordinary body maps as an equivalence condition', () => {
        const original = MarkdownIt.prototype.parse;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env,
        ) {
            const tokens = original.call(this, input, env);
            if (input.includes(':::cut')) {
                const body = tokens.find(
                    (token) => token.type === 'inline' && token.content === 'Body',
                );
                if (body?.map) body.map = [body.map[0] + 1, body.map[1] + 1];
            }
            return tokens;
        });
        try {
            expect(migrateBlockDirectives(cut()).edits).toEqual([]);
        } finally {
            spy.mockRestore();
        }
    });
    it.each([
        '{% if x %}Body{% endif %}',
        '{% unless x %}Body{% else %}{% endunless %}',
        '{% for x in xs %}Body{% endfor %}',
        '{{ value }}',
        '{% if x %}\n\n' + note() + '\n\n{% endif %}',
    ])('refuses unresolved dynamic Cut body %s for the whole document', (body) => {
        const unsafe = cut(body);
        const result = migrateBlockDirectives(`${unsafe}\n\n${cut()}\n\n${note()}`, {
            path: 'dynamic.md',
        });
        expect(result.output.startsWith(unsafe)).toBe(true);
        expect(result.edits).toHaveLength(0);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({
                reason: 'unresolved-liquid-template',
                path: 'dynamic.md',
            }),
        );
    });
    it.each([
        ['cut', '{% cut "{{title}}" %}', '{% endcut %}'],
        ['note', '{% note info "{{title}}" %}', '{% endnote %}'],
        ['tabs', '{% list tabs group="{{title}}" %}', '{% endlist %}'],
    ])('preserves documents with dynamic %s parameters', (_name, open, close) => {
        const unsafe = `${open}\n\n${_name === 'tabs' ? '- First\n\n  Body' : note()}\n\n${close}`;
        const source = unsafe + '\n\n' + cut();
        const result = migrateBlockDirectives(source, {path: 'parameters.md'});
        expect(result.output).toBe(source);
        expect(result.edits).toHaveLength(0);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({
                reason: 'unresolved-liquid-template',
                path: 'parameters.md',
            }),
        );
        for (const title of [']', '"}', ':::']) {
            const options = {vars: {title}, generateID: () => 'parameter-proof'};
            const before = transform(source, options).result;
            const after = transform(result.output, options).result;
            expect(after.meta).toEqual(before.meta);
            // Unknown preprocessing leaves every authored byte unchanged.
            expect(transform(unsafe, options).result.html).toEqual(
                transform(result.output.slice(0, unsafe.length), options).result.html,
            );
        }
    });
    it.each(['{{ title }}', '{% if x %}Title{% endif %}', '{% raw %}{{title}}{% endraw %}'])(
        'keeps dynamic Cut title %s literal',
        (title) => {
            const source = `{% cut "${title}" %}\n\nBody\n\n{% endcut %}`;
            expect(migrateBlockDirectives(source).output).toBe(source);
        },
    );
    it.each([cut(), note()])('refuses unknown document context around %s', (body) => {
        const source = `${note('Before')}\n\n{{ prefix }}\n\n${body}\n\n{{ suffix }}\n\n${note('After')}`;
        const result = migrateBlockDirectives(source, {path: 'context.md'});
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({
                reason: 'unresolved-liquid-template',
                offset: source.indexOf('{{ prefix }}'),
                path: 'context.md',
            }),
        );
        const vars = {prefix: '~~~md', suffix: '~~~'};
        expect(transform(result.output, {vars}).result.html).toEqual(
            transform(source, {vars}).result.html,
        );
    });
    it.each([
        '{{ unfinished',
        '{% custom_template %}',
        '{% include "template" %}',
        '{% if x',
        '{%- cut "Title" -%}',
        '{% list other %}',
        '```md\n{{ value }}\n```',
    ])('refuses unknown or unresolved template syntax %j', (template) => {
        const source = note('Before') + '\n\n' + template + '\n\n' + note('After');
        const result = migrateBlockDirectives(source);
        expect(result.output).toBe(source);
        expect(result.diagnostics[0].reason).toBe('unresolved-liquid-template');
    });
    it('keeps closed metadata interpolation outside the Markdown template boundary', () => {
        const source = '---\ntitle: "{{ prefix }}"\n---\n\n' + note();
        const result = migrateBlockDirectives(source);
        expect(result.edits).toHaveLength(2);
        expect(result.diagnostics).toEqual([]);
        const vars = {prefix: '~~~md'};
        expect(transform(result.output, {vars}).result).toEqual(transform(source, {vars}).result);
    });
    it.each([false, true])('preserves dynamic rendering when x=%s', (x) => {
        const source = cut('{% if x %}Body{% endif %}');
        const result = migrateBlockDirectives(source);
        expect(result.output).toBe(source);
        // Legacy public typings only admit strings; the Liquid engine accepts booleans.
        const vars = {x} as unknown as Record<string, string>;
        expect(transform(result.output, {vars}).result.html).toEqual(
            transform(source, {vars}).result.html,
        );
    });
    it('refuses unresolved dynamic ancestry for the whole document', () => {
        const unsafe = `{% if x %}\n\n${cut()}\n\n{% endif %}`;
        const result = migrateBlockDirectives(`${unsafe}\n\n${cut()}`);
        expect(result.output).toBe(`${unsafe}\n\n${cut()}`);
        expect(result.edits).toHaveLength(0);
    });
    it.each([note(), cut(), '{% list tabs %}\n\n- First\n\n  Body\n\n{% endlist %}'])(
        'migrates Markdown after an unclosed frontmatter opener',
        (body) => {
            const result = migrateBlockDirectives(`---\n\nIntro\n\n${body}`);
            expect(result.edits).toHaveLength(2);
            expect(result.output.startsWith('---\n\nIntro\n\n')).toBe(true);
        },
    );
    it.each(['---', '...'])('protects positively closed frontmatter with %s', (closer) => {
        const header = `---\n${note('Literal')}\n${closer}`;
        const result = migrateBlockDirectives(header + '\n\n' + note());
        expect(result.output.startsWith(header)).toBe(true);
        expect(result.edits).toHaveLength(2);
    });
    it.each([note(note()), cut(note()), note(cut()), '> ' + note().replace(/\n/g, '\n> ')])(
        'preserves nested and quoted Note ownership',
        (source) => {
            const result = migrateBlockDirectives(source);
            expect(result.edits).toHaveLength(
                (source.match(/\{% (?:note|cut) /g) ?? []).length * 2,
            );
            expect(result.diagnostics).toEqual([]);
        },
    );
    it.each(['level', 'meta'] as const)('rejects unrelated candidate %s changes', (field) => {
        const original = MarkdownIt.prototype.parse;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env,
        ) {
            const tokens = original.call(this, input, env);
            if (input.includes(':::note') && input.includes('Body')) {
                const body = tokens.find(
                    (token) => token.type === 'inline' && token.content === 'Body',
                );
                if (field === 'level' && body) body.level += 1;
                if (field === 'meta') env.meta = {unrelated: ['changed']};
            }
            return tokens;
        });
        try {
            expect(migrateBlockDirectives(note()).edits).toEqual([]);
        } finally {
            spy.mockRestore();
        }
    });
    it('retains proven batches around a single rejected group', () => {
        const original = MarkdownIt.prototype.parse;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env,
        ) {
            if (input.includes(':::note [fragile]')) throw new Error('candidate failure');
            return original.call(this, input, env);
        });
        try {
            const safe = Array.from({length: 8}, () => note()).join('\n\n');
            const bad = '{% note info "fragile" %}\n\nBody\n\n{% endnote %}';
            const result = migrateBlockDirectives(safe + '\n\n' + bad);
            expect(result.edits.length).toBeGreaterThanOrEqual(8);
            expect(result.output.endsWith(bad)).toBe(true);
        } finally {
            spy.mockRestore();
        }
    });
    it('bounds actual parse work when every candidate fails', () => {
        const original = MarkdownIt.prototype.parse;
        let chars = 0;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env,
        ) {
            chars += input.length;
            if (input.includes(':::note')) throw new Error('candidate failure');
            return original.call(this, input, env);
        });
        try {
            const source = Array.from({length: 128}, () => note()).join('\n\n');
            const result = migrateBlockDirectives(source);
            expect(result.edits).toEqual([]);
            expect(chars).toBeLessThan(source.length * 50);
            expect(
                result.diagnostics.some((item) => item.reason === 'equivalence-budget-exceeded'),
            ).toBe(true);
            expect(result.diagnostics).toHaveLength(128);
        } finally {
            spy.mockRestore();
        }
    });
});
