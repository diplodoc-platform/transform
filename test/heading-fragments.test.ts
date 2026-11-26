import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {load} from 'cheerio';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import transform from '../src/transform';
import parser from '../src/transform/md';
import includes from '../src/transform/plugins/includes';
import anchors from '../src/transform/plugins/anchors';
import {findBlockTokens} from '../src/transform/utils';
import {markFootnoteBody} from '../src/transform/footnote-data';

let root: string;
beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'heading-fragments-'));
    writeFileSync(
        join(root, 'child.md'),
        '# Child\n\n## Selected {#primary} {#alias}\n\nSelected body\n\n' +
            '### Nested\n\nNested body\n\n## Next\n\nExcluded body\n',
    );
});
afterAll(() => rmSync(root, {recursive: true, force: true}));

describe.each([undefined, false, true])(
    'heading fragments with attrs=%s',
    (enableMarkdownAttrs) => {
        it.each(['primary', 'alias'])(
            'selects standalone ID %s without changing section bounds',
            (id) => {
                const result = transform(`{% include [section](child.md#${id}) %}`, {
                    root,
                    path: join(root, 'root.md'),
                    plugins: [includes, anchors],
                    enableMarkdownAttrs,
                    disableLiquid: true,
                }).result;
                const $ = load(result.html);
                expect($('h2').text()).toContain('Selected');
                expect($('h2').attr('id')).toBe('primary');
                expect(
                    $('h2 a')
                        .map((_, element) => $(element).attr('href'))
                        .get(),
                ).toEqual(['#alias', '#primary']);
                expect(result.html).toContain('Selected body');
                expect(result.html).toContain('Nested body');
                expect(result.html).not.toContain('Excluded body');
            },
        );

        it('supports notitle and repeated materialized fragments', () => {
            const result = transform(
                '{% include notitle [section](child.md#alias) %}\n\n' +
                    '{% include notitle [section](child.md#alias) %}\n\n' +
                    '{% included (child.md) %}\n## Materialized {#primary} {#alias}\n\n' +
                    'Materialized body\n\n## Next\n\nExcluded body\n{% endincluded %}',
                {
                    root,
                    path: join(root, 'materialized.md'),
                    plugins: [includes, anchors],
                    enableMarkdownAttrs,
                    disableLiquid: true,
                },
            ).result;
            expect(load(result.html)('h2')).toHaveLength(0);
            expect(result.html.match(/Materialized body/g)).toHaveLength(2);
            expect(result.html).not.toContain('Excluded body');
        });

        it('does not fall back to a whole file for an absent fragment', () => {
            const result = transform('{% include [missing](child.md#missing) %}', {
                root,
                path: join(root, 'missing.md'),
                plugins: [includes, anchors],
                enableMarkdownAttrs,
                disableLiquid: true,
            }).result;
            expect(result.html).toBe('');
        });
    },
);

it('keeps explicit IDs authoritative and does not infer paragraph or mixed-attribute IDs', () => {
    const document = parser({plugins: [], enableMarkdownAttrs: false}).parseDocument(
        '## Heading {#simple}\n\nBody\n\n## Mixed {#mixed .wide}\n\nParagraph {#paragraph}',
    );
    const before = JSON.stringify(document.tokens);
    expect(findBlockTokens(document.tokens, 'simple')).not.toHaveLength(0);
    expect(findBlockTokens(document.tokens, 'mixed')).toHaveLength(0);
    expect(findBlockTokens(document.tokens, 'paragraph')).toHaveLength(0);
    expect(JSON.stringify(document.tokens)).toBe(before);
    document.tokens[0].attrSet('id', 'explicit');
    expect(findBlockTokens(document.tokens, 'simple')).toHaveLength(0);
    expect(findBlockTokens(document.tokens, 'explicit')).not.toHaveLength(0);
});

describe('fragment token boundaries', () => {
    const parse = (source: string) =>
        parser({plugins: [], enableMarkdownAttrs: false}).parseDocument(source).tokens;

    it('includes the paragraph close and refuses an unterminated paragraph', () => {
        const tokens = parse('Selected paragraph\n\nNext paragraph');
        tokens[0].attrSet('id', 'selected');
        const selected = findBlockTokens(tokens, 'selected');
        expect(selected).toHaveLength(3);
        expect(selected.every((token, index) => token === tokens[index])).toBe(true);
        expect(selected[2].type).toBe('paragraph_close');
        expect(findBlockTokens(tokens.slice(0, 2), 'selected')).toEqual([]);
    });

    it('stops at the next same-level heading, retaining nested and higher-level headings', () => {
        const tokens = parse(
            '## Selected {#selected}\n\nBody\n\n### Nested\n\nNested body\n\n' +
                '# Higher\n\nHigher body\n\n## Stop\n\nExcluded',
        );
        const stop = tokens.findIndex(
            (token, index) =>
                token.type === 'heading_open' && tokens[index + 1]?.content === 'Stop',
        );
        const before = JSON.stringify(tokens);
        const selected = findBlockTokens(tokens, 'selected');
        expect(selected).toEqual(tokens.slice(0, stop));
        expect(selected.every((token, index) => token === tokens[index])).toBe(true);
        expect(
            selected.filter((token) => token.type === 'heading_open').map((token) => token.tag),
        ).toEqual(['h2', 'h3', 'h1']);
        expect(JSON.stringify(tokens)).toBe(before);
    });

    it('retains the EOF index semantics for complete sections and isolated heading openers', () => {
        const tokens = parse('## Last\n\nBody');
        tokens[0].attrSet('id', 'selected');
        expect(findBlockTokens(tokens, 'selected')).toEqual(tokens);
        expect(findBlockTokens(tokens.slice(0, 1), 'selected')).toEqual([]);
        expect(findBlockTokens(tokens.slice(0, 2), 'selected')).toEqual(tokens.slice(0, 2));
    });

    it('excludes footnote-body starts and ignores footnote-body heading boundaries', () => {
        const tokens = parse(
            '## Footnote start\n\nIgnored\n\n## Selected\n\nBody\n\n' +
                '## Footnote boundary\n\nStill selected\n\n## Stop\n\nExcluded',
        );
        const heading = (title: string) =>
            tokens.findIndex(
                (token, index) =>
                    token.type === 'heading_open' && tokens[index + 1]?.content === title,
            );
        const start = heading('Selected');
        const footnote = heading('Footnote boundary');
        const stop = heading('Stop');
        tokens[0].attrSet('id', 'selected');
        tokens[start].attrSet('id', 'selected');
        markFootnoteBody(tokens.slice(0, start));
        markFootnoteBody(tokens.slice(footnote, stop));
        const selected = findBlockTokens(tokens, 'selected');
        expect(selected).toEqual(tokens.slice(start, stop));
        expect(selected.every((token, index) => token === tokens[start + index])).toBe(true);
    });
});
