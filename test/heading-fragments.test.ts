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
