import type {MarkdownIt, Token} from 'markdown-it' with {'resolution-mode': 'import'};

import {load} from 'cheerio';
import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, it, vi} from 'vitest';

import parser from '../src/transform/md';
import DefaultPlugins from '../src/transform/plugins';
import includes from '../src/transform/plugins/includes';
import {
    materializeFootnoteTokens,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from '../src/transform/document';
import {isFootnoteBody} from '../src/transform/footnote-data';

function descriptors(tokens: Token[]): object[] {
    return tokens.flatMap((token) => [
        Object.getOwnPropertyDescriptors(token),
        ...descriptors(token.children ?? []),
    ]);
}

it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
])('keeps one cached plain child independent: inside-first=%s attrs=%s', (insideFirst, attrs) => {
    const generateID = vi.fn(() => 'body');
    const custom = new Date('2020-01-01');
    let parses = 0;
    let checked = false;
    let checkCached = () => {};
    const admit = (md: MarkdownIt) => {
        md.core.ruler.after('yfm_footnote_ownership', 'cached_plain_admission', (state) => {
            const placeholders = state.tokens.flatMap((token, index) =>
                token.type === 'inline' && ['INSIDE', 'OUTSIDE'].includes(token.content)
                    ? [{index: index - 1, inside: token.content === 'INSIDE'}]
                    : [],
            );
            if (!placeholders.length) return;
            parses++;
            // Match the existing include host contract: defer heading anchors
            // until this cached child is admitted to the root document.
            const previousIncludes = state.env.includes;
            state.env.includes = ['root.md'];
            const child = parseDocumentFragmentResult(
                md,
                '# Omitted\n\n## Selected\n\nplain',
                state.env,
                {purpose: 'reference'},
            );
            state.env.includes = previousIncludes;
            const originalTokens = child.tokens.slice();
            const selected = child.tokens.slice(3);
            const heading = selected[0];
            Object.defineProperty(heading, 'consumerHidden', {value: custom});
            for (const token of child.tokens) Object.freeze(token);
            const frozen = descriptors(child.tokens);
            const prepared = new Map<number, Token[]>();
            const callsBefore = generateID.mock.calls.length;
            for (const entry of placeholders.sort((a) => (a.inside === insideFirst ? -1 : 1))) {
                const placeholder = state.tokens[entry.index];
                expect(isFootnoteBody(placeholder)).toBe(entry.inside);
                const tokens = materializeFootnoteTokens(child.tokens, selected, placeholder);
                expect(isFootnoteBody(tokens[0])).toBe(entry.inside);
                if (entry.inside) {
                    expect(tokens).not.toBe(selected);
                    expect(tokens[0]).not.toBe(heading);
                    expect(Reflect.get(tokens[0], 'consumerHidden')).toBe(custom);
                    expect(Object.getPrototypeOf(tokens[0])).toBe(Object.getPrototypeOf(heading));
                } else {
                    expect(tokens).toBe(selected);
                    expect(tokens[0]).toBe(heading);
                }
                // The helper deliberately leaves ordinary output unchanged.
                // This host retains its usual occurrence-copy policy outside bodies.
                const ordinaryCopy = (token: Token): Token =>
                    Object.assign(Object.create(Object.getPrototypeOf(token)), token, {
                        attrs: token.attrs?.map((pair) => [...pair]) ?? null,
                        map: token.map?.slice() ?? null,
                        children: token.children?.map(ordinaryCopy) ?? null,
                    });
                prepared.set(entry.index, entry.inside ? tokens : tokens.map(ordinaryCopy));
                expect(
                    replayDocumentFragment(md, child, state.env, {purpose: 'include'}),
                ).toBeUndefined();
            }
            expect(generateID.mock.calls.length).toBe(callsBefore);
            expect(descriptors(child.tokens)).toEqual(frozen);
            expect(child.tokens.every((token, index) => token === originalTokens[index])).toBe(
                true,
            );
            expect(isFootnoteBody(heading)).toBe(false);
            expect(Reflect.get(heading, 'consumerHidden')).toBe(custom);
            checkCached = () => {
                expect(descriptors(child.tokens)).toEqual(frozen);
                expect(child.tokens.every((token, index) => token === originalTokens[index])).toBe(
                    true,
                );
            };
            for (const [index, tokens] of [...prepared].sort(([a], [b]) => b - a))
                state.tokens.splice(index, 3, ...tokens);
            checked = true;
        });
    };
    const owned = parser({
        disableLiquid: true,
        generateID,
        plugins: [...DefaultPlugins, admit],
        enableMarkdownAttrs: attrs,
    });
    const doc = owned.parseDocument('OUTSIDE\n\nroot[^a]\n\n[^a]: INSIDE');
    expect(checked).toBe(true);
    expect(parses).toBe(1);
    expect(generateID).not.toHaveBeenCalled();
    const html = owned.compileDocument(doc);
    const $ = load(html);
    expect($('h2').length).toBe(2);
    expect($('.footnote-item h2').text()).toBe('Selected');
    expect(doc.env.headings).toHaveLength(1);
    expect(doc.env.headings[0].title).toBe('Selected');
    expect(generateID).toHaveBeenCalledTimes(1);
    expect(owned.compileDocument(doc)).toBe(html);
    const ids = $('[id]')
        .toArray()
        .map((element) => $(element).attr('id'));
    expect(new Set(ids).size).toBe(ids.length);
    checkCached();
});

it('propagates body provenance through actual deeply nested plain includes', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'footnote-plain-include-')));
    try {
        writeFileSync(join(root, 'child.md'), '## Child\n\n{% include [grand](grand.md) %}');
        writeFileSync(join(root, 'grand.md'), '## Grand\n\n{% include [last](last.md) %}');
        writeFileSync(join(root, 'last.md'), '## Last\n\nplain');
        const generateID = vi.fn(() => 'nested');
        const owned = parser({
            disableLiquid: true,
            root,
            path: join(root, 'root.md'),
            generateID,
            plugins: [...DefaultPlugins, includes],
        });
        const doc = owned.parseDocument('root[^a]\n\n[^a]: {% include [child](child.md) %}');
        expect(doc.env.headings).toEqual([]);
        expect(generateID).not.toHaveBeenCalled();
        const $ = load(owned.compileDocument(doc));
        expect($('.footnote-item h2').length).toBe(3);
        expect(generateID).toHaveBeenCalledTimes(1);
    } finally {
        rmSync(root, {recursive: true, force: true});
    }
});
