import type {MarkdownIt as MarkdownItInstance} from '@diplodoc/tabs-extension/plugin';

import MarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';
import {transform as cutPlugin} from '@diplodoc/cut-extension/plugin';
import {createNotesPlugin} from '@diplodoc/notes-extension/plugin';

import {migrateBlockDirectives} from '../src/transform/migrations/block-directives';

const note = (body = 'Body') => `{% note info %}\n\n${body}\n\n{% endnote %}`;
const cut = (body = 'Body') => `{% cut "Title" %}\n\n${body}\n\n{% endcut %}`;
const tabs = (variant = '') =>
    `{% list tabs${variant ? ` ${variant}` : ''} %}\n\n- First\n\n  Body\n\n{% endlist %}`;

describe('block directives migration', () => {
    it.each([
        ['note', note()],
        ['cut', cut()],
        ...['', 'radio', 'dropdown', 'accordion'].map((variant) => [
            `tabs ${variant}`,
            tabs(variant),
        ]),
    ])('migrates %s using reconstructible, idempotent edits', (_name, source) => {
        const result = migrateBlockDirectives(source);
        expect(result.edits).toHaveLength(2);
        expect(result.diagnostics).toEqual([]);
        const reconstructed = [...result.edits]
            .reverse()
            .reduce(
                (text, edit) => text.slice(0, edit.start) + edit.replacement + text.slice(edit.end),
                source,
            );
        expect(reconstructed).toBe(result.output);
        expect(migrateBlockDirectives(result.output).edits).toEqual([]);
    });
    it('preserves BOM, CRLF, emoji, NUL, and untouched prefixes with original UTF-16 offsets', () => {
        const source = '\uFEFF😀\0\r\n\r\n' + note().replace(/\n/g, '\r\n') + '\r\n';
        const result = migrateBlockDirectives(source, {path: 'guide.md'});
        expect(result.edits).toHaveLength(2);
        expect(source.slice(result.edits[0].start, result.edits[0].end)).toBe('{% note info %}');
        expect(result.output.startsWith('\uFEFF😀\0\r\n\r\n')).toBe(true);
        expect(result.output.endsWith('\r\n')).toBe(true);
    });
    it('does not rewrite generated included content and still migrates a safe sibling', () => {
        const protectedText = `{% included (child.md) %}\n\n${note()}\n\n{% endincluded %}`;
        const result = migrateBlockDirectives(`${protectedText}\n\n${note('Sibling')}`);
        expect(result.output.startsWith(protectedText)).toBe(true);
        expect(result.output).toContain(':::note {type=info}');
        expect(result.diagnostics.some((item) => item.reason.includes('protected'))).toBe(true);
    });
    it('refuses tight-list note and preserves a safe sibling', () => {
        const tight = '- ' + note().replace(/\n/g, '\n  ');
        const result = migrateBlockDirectives(`${tight}\n\n${note('Sibling')}`);
        expect(result.output.startsWith(tight)).toBe(true);
        expect(result.output).toContain(':::note {type=info}');
        expect(result.diagnostics.some((item) => item.reason === 'equivalence-check-failed')).toBe(
            true,
        );
    });
    it('protects malformed and unclosed parents, frontmatter, code and HTML', () => {
        const examples = [
            `{% cut missing %}\n\n${note()}\n\n{% endcut %}`,
            `{% cut "Title" %}\n\n${note()}`,
            `---\ntitle: x\n${note()}\n---`,
            `\`\`\`md\n${note()}\n\`\`\``,
            `<div>\n${note()}\n</div>`,
            `:::no-translate\n\n${note()}\n\n:::`,
        ];
        for (const source of examples) expect(migrateBlockDirectives(source).output).toBe(source);
    });
    it('locates refusals using original positions', () => {
        const source =
            '\uFEFF😀\r\n\r\n' + ('- ' + note().replace(/\n/g, '\n  ')).replace(/\n/g, '\r\n');
        const result = migrateBlockDirectives(source, {path: 'guide.md'});
        expect(result.diagnostics[0]).toMatchObject({path: 'guide.md', line: 3, column: 3});
        expect(source.slice(result.diagnostics[0].offset)).toMatch(/^\{% note/);
    });
    it.each(['Body', 'One\n\nTwo', '\n\nBody', '> quoted'])(
        'preserves actual note body maps and fields: %s',
        (body) => {
            const source = note(body);
            const result = migrateBlockDirectives(source);
            expect(result.edits).toHaveLength(2);
            const parse = (text: string) =>
                new MarkdownIt()
                    .use(createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'}))
                    .parse(text, {});
            const before = parse(source),
                after = parse(result.output);
            const fields = (tokens: ReturnType<typeof parse>) =>
                tokens
                    .filter((token) => !token.type.startsWith('yfm_note_'))
                    .map(({type, map, attrs, content, hidden, level, block}) => ({
                        type,
                        map,
                        attrs,
                        content,
                        hidden,
                        level,
                        block,
                    }));
            expect(fields(after)).toEqual(fields(before));
            const oldMap = before.find((token) => token.type === 'yfm_note_content_open')?.map;
            const newMap = after.find((token) => token.type === 'yfm_note_content_open')?.map;
            const close = before.find((token) => token.type === 'yfm_note_close')?.map?.[0];
            expect(close).toBeDefined();
            if (close === undefined) throw new Error('Missing note close map');
            expect(oldMap).toEqual([2, close - 1]);
            expect(newMap).toEqual([1, close]);
        },
    );
    it('detects the real Cut title attribution change in a loose list', () => {
        const source = '- prefix\n\n  ' + cut().replace(/\n/g, '\n  ');
        const colon = source
            .replace('{% cut "Title" %}', ':::cut [Title]')
            .replace('{% endcut %}', ':::');
        const parse = (text: string) =>
            new MarkdownIt()
                .use(cutPlugin({bundle: false, runtime: false, directiveSyntax: 'enabled'}))
                .parse(text, {});
        const before = parse(source),
            after = parse(colon);
        const title = (tokens: ReturnType<typeof parse>) =>
            tokens.find((token) => token.type === 'inline' && token.content === 'Title');
        expect(title(before)?.map).toEqual([0, 1]);
        expect(title(after)?.map).toEqual([2, 3]);
        expect(migrateBlockDirectives(source).output).toBe(source);
    });
    it('rejects a non-recognized empty Cut instead of introducing a container', () => {
        const source = '{% cut "Title" %}\n\n{% endcut %}';
        expect(migrateBlockDirectives(source).output).toBe(source);
    });
    it.each([
        '{% cut "Outer" %}\n\n{% note info %}\n\nBody\n\n{% endcut %}\n\n{% endnote %}',
        ':::cut {unknown=x}\n\n' + note() + '\n\n:::',
    ])('refuses crossed or invalid parent', (source) => {
        expect(migrateBlockDirectives(source).output).toBe(source);
    });
    it.each(['\n', '\r\n', '\r'])(
        'preserves line-ending style and edit identity for %j',
        (newline) => {
            for (const suffix of ['', newline]) {
                const source =
                    '\uFEFF' + note('😀 first\n\nsecond').replace(/\n/g, newline) + suffix;
                const result = migrateBlockDirectives(source);
                expect(result.edits).toHaveLength(2);
                expect(
                    [...result.edits]
                        .reverse()
                        .reduce(
                            (text, edit) =>
                                text.slice(0, edit.start) + edit.replacement + text.slice(edit.end),
                            source,
                        ),
                ).toBe(result.output);
                expect(migrateBlockDirectives(result.output).output).toBe(result.output);
                expect(result.output.endsWith(suffix)).toBe(true);
            }
        },
    );
    it('protects nested generated and unclosed generated cache regions', () => {
        for (const source of [
            `{% included (one) %}\n{% included (two) %}\n\n${note()}\n\n{% endincluded %}\n{% endincluded %}`,
            `{% included (one) %}\n\n${note()}`,
        ])
            expect(migrateBlockDirectives(source).output).toBe(source);
    });
    it('migrates an independently safe sibling after malformed Cut', () => {
        const bad = `{% cut missing %}\n\n${note()}\n\n{% endcut %}`;
        const result = migrateBlockDirectives(`${bad}\n\n${note('Safe')}`);
        expect(result.output.startsWith(bad)).toBe(true);
        expect(result.output).toContain(':::note {type=info}');
    });
    it('preserves actual Cut body maps and attributes', () => {
        const source = cut('One\n\nTwo');
        const output = migrateBlockDirectives(source).output;
        expect(output).not.toBe(source);
        const parse = (text: string) =>
            new MarkdownIt()
                .use(cutPlugin({bundle: false, runtime: false, directiveSyntax: 'enabled'}))
                .parse(text, {});
        const body = (text: string) =>
            parse(text)
                .filter(
                    (token) => token.type === 'inline' && ['One', 'Two'].includes(token.content),
                )
                .map(({map, attrs, content, hidden}) => ({map, attrs, content, hidden}));
        expect(body(output)).toEqual(body(source));
    });
    it('migrates nested Cut and Note together when the whole document remains equivalent', () => {
        const source = cut(note());
        const result = migrateBlockDirectives(source);
        expect(result.edits).toHaveLength(4);
        expect(result.output).toContain(':::cut [Title]');
        expect(result.output).toContain(':::note {type=info}');
    });
    it('quarantines a crossed Note until its own close and retains the later sibling', () => {
        const crossed = `{% cut "Outer" %}\n\n{% note info %}\n\nBody\n\n{% endcut %}\n\n${note('Inside')}\n\n{% endnote %}`;
        const result = migrateBlockDirectives(`${crossed}\n\n${note('Safe')}`);
        expect(result.output.startsWith(crossed)).toBe(true);
        expect(result.output).toContain(':::note {type=info}\n\nSafe');
        expect(result.edits).toHaveLength(2);
    });
    it('keeps three crossed families and their descendants quarantined until each close', () => {
        const crossed = `{% cut "Outer" %}\n\n{% note info %}\n\n{% list tabs %}\n\n- First\n\n  Body\n\n{% endcut %}\n\n${note('Inside')}\n\n{% endnote %}\n\n${note('Still inside')}\n\n{% endlist %}`;
        const result = migrateBlockDirectives(`${crossed}\n\n${note('Safe')}`);
        expect(result.output.startsWith(crossed)).toBe(true);
        expect(result.output).toContain(':::note {type=info}\n\nSafe');
    });
    it('quarantines an unclosed crossed parent through EOF', () => {
        const source = `{% cut "Outer" %}\n\n{% note info %}\n\n{% endcut %}\n\n${note('Inside')}`;
        expect(migrateBlockDirectives(source).output).toBe(source);
    });
    it.each([
        'a]b',
        'a[b',
        'a &amp; b',
        '*emphasis*',
        '[link](https://example.org)',
        'back\\slash',
    ])('preserves parsed title %s and safe siblings', (title) => {
        const source = `${note('Safe')}\n\n{% note info "${title}" %}\n\nBody\n\n{% endnote %}`;
        const result = migrateBlockDirectives(source);
        expect(result.edits).toHaveLength(4);
        expect(migrateBlockDirectives(result.output).output).toBe(result.output);
    });
    it('preserves malformed titles and still migrates a safe sibling', () => {
        const bad = `{% note info "bad %}\n\nBody\n\n{% endnote %}`;
        const result = migrateBlockDirectives(`${bad}\n\n${note('Safe')}`);
        expect(result.output.startsWith(bad)).toBe(true);
        expect(result.output).toContain(':::note {type=info}\n\nSafe');
    });
    it.each([
        'a]b',
        'a[b',
        'a &amp; b',
        '*emphasis*',
        '[link](https://example.org)',
        'back\\slash',
    ])('preserves Cut title %s with a safe sibling', (title) => {
        const source = `{% cut "${title}" %}\n\nBody\n\n{% endcut %}\n\n${note('Safe')}`;
        const result = migrateBlockDirectives(source);
        expect(result.edits).toHaveLength(4);
        expect(migrateBlockDirectives(result.output).output).toBe(result.output);
    });
    it('isolates a parser exception to the affected candidate and keeps the safe sibling', () => {
        const source = `{% note info "fragile" %}\n\nBody\n\n{% endnote %}\n\n${note('Safe')}`;
        const original = MarkdownIt.prototype.parse;
        const spy = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
            this: MarkdownItInstance,
            input,
            env,
        ) {
            if (input.includes(':::note [fragile]')) throw new Error('candidate parser failure');
            return original.call(this, input, env);
        });
        try {
            const result = migrateBlockDirectives(source);
            expect(result.output).toContain('{% note info "fragile" %}');
            expect(result.output).toContain(':::note {type=info}\n\nSafe');
            expect(
                result.diagnostics.some((item) => item.reason === 'equivalence-check-failed'),
            ).toBe(true);
        } finally {
            spy.mockRestore();
        }
    });
    it.each([
        '{unknown="!"}',
        '{foo=@}',
        '{!}',
        '{class="a"}{unknown="b"}',
        '{class="a" unknown="!"}',
        '{class=!}',
        '{#id .class}',
        ' {id="anchor"}',
    ])('preserves the complete unproved Cut suffix %s and its descendants', (suffix) => {
        const protectedParent = `{% cut "Outer" %}${suffix}\n\n${note('Nested')}\n\n{% endcut %}`;
        const source = `${protectedParent}\n\n${note('Safe')}`;
        const result = migrateBlockDirectives(source, {path: 'attrs.md'});
        expect(result.output.startsWith(protectedParent)).toBe(true);
        expect(result.output).toContain(':::note {type=info}\n\nSafe');
        expect(result.edits).toHaveLength(2);
        expect(result.edits.every((edit) => edit.start >= protectedParent.length)).toBe(true);
        expect(
            result.diagnostics.some((item) => item.offset === 0 && item.path === 'attrs.md'),
        ).toBe(true);
    });
    it('accepts exactly round-tripped Cut attrs and preserves HTML, body maps, attributes and metadata', () => {
        const source =
            '{% cut "Title" %}{id="anchor" class="extra" name="team" open="true"}\n\nBody\n\n{% endcut %}';
        const result = migrateBlockDirectives(source);
        expect(result.edits).toHaveLength(2);
        expect(result.output).toContain(
            ':::cut [Title] {id="anchor" class="extra" name="team" open="true"}',
        );
        const parse = (text: string) => {
            const md = new MarkdownIt().use(cutPlugin({bundle: false, directiveSyntax: 'enabled'}));
            const env = {};
            const tokens = md.parse(text, env);
            const body = tokens
                .filter((token) => token.content === 'Body')
                .map(({map, attrs, hidden, content}) => ({map, attrs, hidden, content}));
            for (const token of tokens) if (token.type.startsWith('yfm_cut_')) token.block = false;
            return {html: md.renderer.render(tokens, md.options, env), body, env};
        };
        expect(parse(result.output)).toEqual(parse(source));
    });
});
