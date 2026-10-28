import type {BuiltinPluginSettings} from '../src/transform/plugin-configuration';
import type {ParsedDocumentFragment} from '../src/transform/document';
import type {MarkdownIt as ConfiguredMarkdownIt, ParserEnv} from '../src/transform/typings';

import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import {expectTypeOf, vi} from 'vitest';

import transform from '../src/transform';
import parser from '../src/transform/md';
import {
    createDocumentEnv,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from '../src/transform/document';
import {createDeprecationReporter} from '../src/transform/deprecation';
import {log} from '../src/transform/log';
import {migrateImageDimensions} from '../src/transform/migrations/image-dimensions';
import imsize from '../src/transform/plugins/imsize';
import {imageWithSize} from '../src/transform/plugins/imsize/plugin';

const consumer = () => ({warn: vi.fn(), info: vi.fn(), error: vi.fn()});
const code = 'IMAGE_SIZE_LEGACY_SYNTAX';

beforeEach(() => log.clear());

describe('image dimension compatibility warnings', () => {
    test.each(['current', 'legacy'] as const)(
        'preserves %s output and warns once per path/document',
        (mode) => {
            const logger = consumer();
            const md = new MarkdownIt().use(imsize, {log: logger, compatibility: {[code]: mode}});
            const source = '![a](a =0x00) ![b](b =1%%x2%) ![c](c =x)';
            expect(logger.warn).not.toHaveBeenCalled();
            const first = md.render(source, {path: '/a.md'});
            expect(first).toContain('width="0" height="00"');
            expect(first).toContain('width="1%%" height="2%"');
            expect(logger.warn).toHaveBeenCalledTimes(1);
            expect(logger.warn.mock.calls[0][0]).toContain('/a.md.');
            expect(logger.warn.mock.calls[0][0]).not.toMatch(/\/a.md:\d/);
            expect(md.render(source, {path: '/a.md'})).toBe(first);
            expect(logger.warn).toHaveBeenCalledTimes(2);
        },
    );

    test('uses explicit reporter scope, genuine env paths and nonblank fallback', () => {
        const logger = consumer();
        const reporter = createDeprecationReporter({log: logger});
        const md = new MarkdownIt().use(imsize, {deprecations: reporter, path: 'configured.md'});
        for (const path of ['a.md', 'a.md', 'b.md', '', ' ']) {
            md.render('![a](a =x)', {path});
        }
        expect(logger.warn).toHaveBeenCalledTimes(3);
        reporter.reset();
        md.render('![a](a =x)', {});
        expect(logger.warn).toHaveBeenCalledTimes(4);
        const noPath = consumer();
        new MarkdownIt().use(imsize, {log: noPath, path: ' '}).render('![a](a =x)');
        expect(noPath.warn.mock.calls[0][0]).toContain('option "imsize legacy image dimensions"');
    });

    test('does not warn for silent lookahead, modern, rejected or protected syntax', () => {
        const logger = consumer();
        const md = new MarkdownIt({html: true}).use(imsize, {log: logger});
        const state = new md.inline.State('![a](a =20x30)', md, {}, []);
        expect(imageWithSize(md)(state, true)).toBe(true);
        md.render(
            '![a](a){width=20}\n\n![a](a =2.5x3)\n\n`![a](a =2x3)`\n\n```\n![a](a =2x3)\n```\n\n<!-- ![a](a =2x3) -->',
        );
        expect(logger.warn).not.toHaveBeenCalled();
    });

    test('preserves existing token metadata and modern override behavior', () => {
        const md = new MarkdownIt().use(imsize);
        md.core.ruler.before('imsize_deprecation', 'metadata', (state) => {
            const token = state.tokens[1].children?.[0];
            if (!token) throw new Error('Expected image token');
            token.meta = {custom: {value: 42}, legacySize: 'consumer'};
        });
        const token = md.parse('![a](a =20x30){width=40}', {})[1].children?.[0];
        if (!token) throw new Error('Expected image token');
        expect(token.meta).toEqual({custom: {value: 42}, legacySize: 'consumer'});
        expect(token.attrGet('width')).toBe('40');
        expect(token.attrGet('height')).toBe('30');
    });

    test('document/include paths deduplicate, fresh roots reset, and fragment replay is quiet', () => {
        const logger = consumer();
        let native: ConfiguredMarkdownIt | undefined;
        let cached: ParsedDocumentFragment | undefined;
        const instance = parser({
            path: '/root.md',
            log: logger,
            enableInlineStyling: true,
            plugins: [
                imsize,
                (md) => {
                    native = md;
                    md.core.ruler.push('test_children', (state) => {
                        if (!state.src.startsWith('root')) return;
                        cached = parseDocumentFragmentResult(
                            md,
                            '![child](child =20x30)',
                            state.env,
                            {purpose: 'include', path: '/child.md'},
                        );
                        parseDocumentFragmentResult(md, '![child](child =20x30)', state.env, {
                            purpose: 'include',
                            path: '/child.md',
                        });
                        parseDocumentFragmentResult(md, '![other](other =20x30)', state.env, {
                            purpose: 'include',
                            path: '/other.md',
                        });
                    });
                },
            ],
        });
        const source = 'root ![root](root =20x30)';
        const a = instance.parseDocument(source);
        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(a.env.additionalOptionsCssWhiteList).toMatchObject({'aspect-ratio': true});
        const b = instance.parseDocument('plain');
        expect(b.env.additionalOptionsCssWhiteList?.['aspect-ratio']).toBeUndefined();
        expect(logger.warn).toHaveBeenCalledTimes(3);
        if (!native || !cached) throw new Error('Expected parsed child');
        const target = createDocumentEnv();
        replayDocumentFragment(native, cached, target, {purpose: 'include'});
        expect(target.additionalOptionsCssWhiteList).toMatchObject({'aspect-ratio': true});
        expect(logger.warn).toHaveBeenCalledTimes(3);
        instance.parseDocument(source);
        expect(logger.warn).toHaveBeenCalledTimes(6);
    });

    test('root calls have fresh reporter scopes and named options remain closed', () => {
        const logger = consumer();
        const options = {disableLiquid: true, disableLint: true, log: logger};
        transform('![a](a =20x30)', options);
        transform('![a](a =20x30)', options);
        expect(logger.warn.mock.calls.filter(([message]) => message.includes(code))).toHaveLength(
            2,
        );
        expectTypeOf<'path'>().not.toMatchTypeOf<
            keyof NonNullable<BuiltinPluginSettings['imsize']>
        >();
    });
});

describe('pure image dimensions migration', () => {
    test.each([
        ['=300x200', '{width=300 height=200}'],
        ['=300x', '{width=300}'],
        ['=x200', '{height=200}'],
        ['=50%x100%', '{width=50% height=100%}'],
        ['=0x0', '{width=0 height=0}'],
        ['=00x020', '{width=00 height=020}'],
        ['=0%x00', '{width=0% height=00}'],
        ['=20x50%', '{width=20 height=50%}'],
        ['=50%x', '{width=50%}'],
        ['=x', ''],
    ])('migrates %s without normalizing values', (legacy, replacement) => {
        const source = `![alt](image.png "title" ${legacy})`;
        const result = migrateImageDimensions(source);
        expect(result.output).toBe(`![alt](image.png "title")${replacement}`);
        expect(result.diagnostics).toEqual([]);
        expect(migrateImageDimensions(result.output)).toEqual({
            output: result.output,
            edits: [],
            diagnostics: [],
        });
    });

    test.each([
        "![a](a 'single' =20x30)",
        '![a](a (parenthesized) =20x30)',
        '- ![a](a =20x30)',
        '> ![a](a =20x30)',
        '[![a](a =20x30)](target)',
        '**![a](a =20x30)**',
        '![a](a\n =20x30)',
        '![a](a =20x30\n)',
        '![](a =20x30)',
    ])('preserves valid title/container boundaries: %s', (source) => {
        const result = migrateImageDimensions(source);
        expect(result.diagnostics).toEqual([]);
        expect(result.edits).toHaveLength(2);
        expect(result.output).toContain('{width=20 height=30}');
    });

    test.each([
        ['![a](a =1%%x2%)', 'noncanonical-dimensions'],
        ['![a](a =x%)', 'noncanonical-dimensions'],
        ['![a](a =1%2x3)', 'noncanonical-dimensions'],
        ['![a](a =20x30){width=40}', 'existing-attributes'],
        ['![a](a =20x30){#id title="hi"}', 'existing-attributes'],
        ['![a](a =20x30){unclosed', 'existing-attributes'],
        ['![a](a =2.5x3)', 'unsupported-legacy-form'],
        ['![a](a =2pxx3)', 'unsupported-legacy-form'],
        ['![a](a =2X3)', 'unsupported-legacy-form'],
        ['![a](a =-2x3)', 'unsupported-legacy-form'],
        ['![a](a\n =20x30\n)', 'equivalence-check-failed'],
        ['> ![a](a\n>  =2x3)', 'ambiguous-source-range'],
        ['![outer ![inner](i =2x3)](o =4x5)', 'nested-image'],
    ])('leaves unproven source unchanged: %s', (source, reason) => {
        const result = migrateImageDimensions(source, {path: 'guide.md'});
        expect(result.output).toBe(source);
        expect(result.edits).toEqual([]);
        expect(result.diagnostics.some((item) => item.reason === reason)).toBe(true);
        expect(result.diagnostics.every((item) => item.path === 'guide.md')).toBe(true);
    });

    test.each([
        '`![a](a =2x3)`',
        '```md\n![a](a =2x3)\n```',
        '    ![a](a =2x3)',
        '<!-- ![a](a =2x3) -->',
        '<div>\n![a](a =2x3)\n</div>',
        '---\ntitle: "![a](a =2x3)"\n---',
        '\\![a](a =2x3)',
        '![a](https://a.test/?size=2x3)',
        '![a][ref]\n\n[ref]: a "title"',
        '![a][ref]{width=2}\n\n[ref]: a',
        '![a][]\n\n[a]: a',
        '![a]\n\n[a]: a',
        '[a]: a =2x3',
    ])('does not touch protected, reference or unrelated text: %s', (source) => {
        expect(migrateImageDimensions(source)).toEqual({
            output: source,
            edits: [],
            diagnostics: [],
        });
    });

    test('preserves CRLF, astral UTF-16 coordinates, URLs, quotes, whitespace and escapes', () => {
        const source =
            "\uFEFF---\r\ntitle: \"![x](x =2x3)\"\r\n---\r\n\r\n😀 ![a\\] &amp; **b**](<a\\(b\\).png?q=1&n=2> 'ti\\'tle'  =00x20  )\r\n\r\n![z](z =2x)";
        const result = migrateImageDimensions(source);
        expect(result.diagnostics).toEqual([]);
        expect(result.output).toBe(
            source
                .replace(' =00x20', '')
                .replace('  )', '  ){width=00 height=20}')
                .replace(' =2x)', '){width=2}'),
        );
        const reconstructed = [...result.edits]
            .reverse()
            .reduce(
                (text, edit) => text.slice(0, edit.start) + edit.replacement + text.slice(edit.end),
                source,
            );
        expect(reconstructed).toBe(result.output);
        for (let index = 1; index < result.edits.length; index++) {
            expect(result.edits[index].start).toBeGreaterThanOrEqual(result.edits[index - 1].end);
        }
        const diagnostic = migrateImageDimensions('😀\r\n![a](a =1%%x2)', {path: 'a.md'})
            .diagnostics[0];
        expect(diagnostic).toMatchObject({offset: 11, line: 2, column: 8});
    });

    test.each([false, true])(
        'proves native and sanitized output/CSS with attrs=%s and both styling modes',
        (generalAttrs) => {
            const source = '![*a*](a "title" =20x30) ![b](b =50%x20) ![c](c =x)';
            const migrated = migrateImageDimensions(source).output;
            for (const styling of [false, true]) {
                const md = new MarkdownIt().use(imsize, {enableInlineStyling: styling});
                if (generalAttrs) md.use(attrs);
                const before: ParserEnv = {};
                const after: ParserEnv = {};
                expect(md.render(source, before)).toBe(md.render(migrated, after));
                expect(before.additionalOptionsCssWhiteList).toEqual(
                    after.additionalOptionsCssWhiteList,
                );
                const options = {
                    disableLiquid: true,
                    disableLint: true,
                    allowHTML: true,
                    enableInlineStyling: styling,
                    enableMarkdownAttrs: generalAttrs,
                };
                expect(transform(source, options).result.html).toBe(
                    transform(migrated, options).result.html,
                );
            }
        },
    );

    test('has no global logging side effects', () => {
        log.info('keep me');
        const before = JSON.stringify(log.get());
        migrateImageDimensions('![a](a =2x3) ![b](b =1%%x2)');
        expect(JSON.stringify(log.get())).toBe(before);
    });
});
