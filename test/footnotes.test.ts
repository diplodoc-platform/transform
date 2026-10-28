import type {MarkdownIt as Native, Token} from 'markdown-it' with {'resolution-mode': 'import'};

import MarkdownIt from 'markdown-it';
import {load} from 'cheerio';
import {describe, expect, it, vi} from 'vitest';
import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import parser from '../src/transform/md';
import DefaultPlugins from '../src/transform/plugins';
import footnotes from '../src/transform/plugins/footnotes';
import includes from '../src/transform/plugins/includes';
import {
    materializeFootnoteTokens,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from '../src/transform/document';
import {sourceScope} from '../src/transform/footnote-data';

const source = '# Title[^a]\n\nBody[^a].\n\n[^a]: note\n\n    ## Private heading';
function verify(html: string) {
    const $ = load(html);
    const ids = $('[id]')
        .toArray()
        .map((element) => $(element).attr('id'));
    expect(new Set(ids).size).toBe(ids.length);
    $('.footnote-ref a, .footnote-backref').each((_i, element) => {
        expect(ids).toContain($(element).attr('href')?.slice(1));
    });
    return $;
}
function countTokenRefs(tokens: Token[]): number {
    return tokens.reduce(
        (sum, token) =>
            sum + (token.type === 'footnote_ref' ? 1 : 0) + countTokenRefs(token.children ?? []),
        0,
    );
}

describe('owned footnote output', () => {
    it('binds an extracted H1 early, keeps A/B/A stable, and excludes body headings', () => {
        const generateID = vi.fn(() => `prefix${generateID.mock.calls.length}`);
        const md = parser({disableLiquid: true, extractTitle: true, generateID});
        const a = md.parseDocument(source);
        expect(generateID).toHaveBeenCalledTimes(1);
        expect(a.env.headings).toEqual([]);
        const tokens = a.tokens.slice();
        const html = md.compileDocument(a);
        const $ = verify(a.env.title + html);
        expect(
            $('.footnote-backref')
                .map((_i, element) => $(element).text())
                .get(),
        ).toEqual(['Назад к ссылке 1:1', 'Назад к ссылке 1:2']);
        const b = md.parseDocument(source.replace('Title', 'Second'));
        md.compileDocument(b);
        expect(md.compileDocument(a)).toBe(html);
        expect(a.tokens).toEqual(tokens);
        expect(generateID).toHaveBeenCalledTimes(2);
        expect(md.compile(a.tokens.slice(), a)).toBe(html);
    });

    it.each([
        [false, false],
        [false, true],
        [true, false],
        [true, true],
    ])('preserves title precedence %s/%s', (extractTitle, needTitle) => {
        const md = parser({
            disableLiquid: true,
            extractTitle,
            needTitle,
            generateID: () => 'fixed',
        });
        const doc = md.parseDocument('# First[^a]\n\n# Second[^b]\n\n[^a]: alpha\n[^b]: beta');
        const html = md.compileDocument(doc);
        const $ = verify((extractTitle && !needTitle ? doc.env.title : '') + html);
        expect($('h1').length).toBe(extractTitle ? 1 : 2);
        if (needTitle) expect(doc.env.title).toBe(extractTitle ? 'Second[^b]' : 'First[^a]');
        else if (!extractTitle) expect(doc.env.title).toBe('');
        expect($('.footnote-item').length).toBe(extractTitle && needTitle ? 1 : 2);
    });

    it('does not allocate for a title discarded by needTitle or inline-only output', () => {
        const generateID = vi.fn(() => 'constant');
        for (const options of [{extractTitle: true, needTitle: true}, {renderInline: true}]) {
            const md = parser({disableLiquid: true, generateID, ...options});
            const doc = md.parseDocument('# Only[^a]\n\nplain\n\n[^a]: body');
            expect(md.compileDocument(doc)).not.toContain('footnote-item');
        }
        expect(generateID).not.toHaveBeenCalled();
    });

    it.each(['<em>Replacement</em>', 'plain replacement'])(
        'preserves an opaque title replacement %s',
        (replacement) => {
            const generateID = vi.fn(() => 'constant');
            for (const body of ['plain', 'body[^a]']) {
                const md = parser({disableLiquid: true, extractTitle: true, generateID});
                const doc = md.parseDocument(`# Only[^a]\n\n${body}\n\n[^a]: note`);
                doc.env.title = replacement;
                const $ = verify(doc.env.title + md.compileDocument(doc));
                expect(doc.env.title).toBe(replacement);
                expect($('.footnote-backref').length).toBe(body === 'plain' ? 0 : 1);
            }
            expect(generateID).toHaveBeenCalledTimes(2);
        },
    );

    it.each(['append', 'prepend'])(
        'rejects recognizable retained generated title anchors: %s',
        (mode) => {
            const generateID = vi.fn(() => 'constant');
            const md = parser({disableLiquid: true, extractTitle: true, generateID});
            const doc = md.parseDocument('# Only[^a]\n\n[^a]: note');
            const before = doc.tokens.slice();
            doc.env.title = mode === 'append' ? doc.env.title + 'suffix' : 'prefix' + doc.env.title;
            const title = doc.env.title;
            expect(() => md.compileDocument(doc)).toThrow('overridden title must replace');
            expect(doc.env.title).toBe(title);
            expect(doc.tokens).toEqual(before);
            expect(generateID).toHaveBeenCalledTimes(1);
        },
    );

    it('materializes genuine cached children, selections, and same-label scopes without replay effects', () => {
        let native: Native | undefined;
        const generateID = vi.fn(() => 'constant');
        const md = parser({
            disableLiquid: true,
            generateID,
            plugins: [
                ...DefaultPlugins,
                (value) => {
                    native = value;
                },
            ],
        });
        const root = md.parseDocument('root');
        if (!native) throw new Error('Missing configured parser');
        const fragment = parseDocumentFragmentResult(
            native,
            'one[^a]\n\nsecond[^a]\n\n[^a]: child',
            root.env,
            {purpose: 'reference'},
        );
        const original = fragment.tokens.slice();
        const firstParagraph = fragment.tokens.slice(0, 3);
        const prepared = materializeFootnoteTokens(fragment.tokens, firstParagraph);
        expect(generateID).not.toHaveBeenCalled();
        expect(
            replayDocumentFragment(native, fragment, root.env, {purpose: 'include'}),
        ).toBeUndefined();
        root.tokens.push(
            ...prepared,
            ...materializeFootnoteTokens(fragment.tokens, firstParagraph),
        );
        const other = parseDocumentFragmentResult(native, 'other[^a]\n\n[^a]: separate', root.env, {
            purpose: 'reference',
        });
        root.tokens.push(...materializeFootnoteTokens(other.tokens));
        const $ = verify(md.compileDocument(root));
        expect($('.footnote-item').length).toBe(3);
        expect($('.footnote-backref').length).toBe(3);
        expect(fragment.tokens).toEqual(original);
        expect(generateID).toHaveBeenCalledTimes(1);
    });

    it('processes actual nested includes inside bodies and task markers after tail admission', () => {
        const root = realpathSync(mkdtempSync(join(tmpdir(), 'footnote-include-')));
        try {
            writeFileSync(
                join(root, 'child.md'),
                'child[^x]\n\n[^x]: - [ ] child task\n\n    {% include [grand](grand.md) %}',
            );
            writeFileSync(
                join(root, 'grand.md'),
                'grand[^x]\n\n[^x]: - [x] grand task\n\n    ## Hidden',
            );
            const generateID = vi.fn(() => 'constant');
            const md = parser({
                disableLiquid: true,
                root,
                path: join(root, 'root.md'),
                generateID,
                plugins: [...DefaultPlugins, includes],
            });
            const doc = md.parseDocument(
                'root[^x]\n\n[^x]: - [x] root task\n\n    {% include [child](child.md) %}',
            );
            const $ = verify(md.compileDocument(doc));
            expect($('.footnote-item').length).toBe(3);
            expect($('input[disabled]').length).toBe(3);
            expect(doc.env.headings).toEqual([]);
            expect(generateID).toHaveBeenCalledTimes(1);
        } finally {
            rmSync(root, {recursive: true, force: true});
        }
    });
});

describe('native footnote callback', () => {
    it('isolates reused env, preserves parsed-array ownership and consumes callbacks only for successful candidate attempts', () => {
        const generateID = vi.fn(() => `raw${generateID.mock.calls.length}`);
        const md = new MarkdownIt().use(footnotes, {generateID, lang: 'en'});
        const footnoteState = {custom: true};
        const env = {footnotes: footnoteState, title: 'caller'};
        const a = md.parse('A[^a]\n\n[^a]: alpha', env);
        const b = md.parse('B[^a]\n\n[^a]: beta', env);
        expect(countTokenRefs(a)).toBe(1);
        expect(generateID).not.toHaveBeenCalled();
        const html = md.renderer.render(a, md.options, env);
        verify(html);
        md.renderer.render(b, md.options, env);
        expect(md.renderer.render(a, md.options, env)).toBe(html);
        expect(env).toEqual({footnotes: footnoteState, title: 'caller'});
        expect(generateID).toHaveBeenCalledTimes(2);
        expect(() => md.renderer.render(a.slice(), md.options, env)).toThrow(
            'original parsed token array',
        );
        const selected = materializeFootnoteTokens(a, a.slice(0, 3));
        expect(generateID).toHaveBeenCalledTimes(2);
        verify(md.renderer.render(selected, md.options, env));
        expect(generateID).toHaveBeenCalledTimes(3);
        const failed = md.parse('failed[^a]\n\n[^a]: body', env);
        const rule = md.renderer.rules.text;
        md.renderer.rules.text = () => {
            throw new Error('renderer failed');
        };
        expect(() => md.renderer.render(failed, md.options, env)).toThrow('renderer failed');
        expect(sourceScope(failed)?.rawOutput?.namespace).toBeUndefined();
        md.renderer.rules.text = rule;
        verify(md.renderer.render(failed, md.options, env));
        expect(generateID).toHaveBeenCalledTimes(5);
        expect(md.renderInline('[^a] and ^[inline]', env)).toContain('[^a] and ^[inline]');
    });
});

describe('footnote grammar, security, and rollback', () => {
    it.each([
        ['missing[^x]', 0],
        ['unused\n\n[^x]: absent', 0],
        ['\\[^a]\n\n[^a]: escaped', 0],
        ['`[^a]`\n\n[^a]: code', 0],
        ['first[^a] and second[^a]\n\n[^a]: **bold**\n\n    second paragraph', 1],
        ['a[^a]\n\n[^a]: body[^b]\n[^b]: transitive', 2],
        ['a[^a]\n\n[^a]: first\n[^a]: second', 1],
    ])('retains official reference grammar: %s', (input, bodies) => {
        const generateID = vi.fn(() => 'grammar');
        const md = parser({disableLiquid: true, generateID, plugins: [footnotes]});
        const doc = md.parseDocument(input);
        const $ = verify(md.compileDocument(doc));
        expect($('.footnote-item').length).toBe(bodies);
        expect(generateID.mock.calls.length).toBe(bodies ? 1 : 0);
    });

    it('keeps localized readable backlink text in sanitized output', () => {
        for (const lang of [
            'ru',
            'en',
            'ar',
            'cs',
            'fr',
            'es',
            'he',
            'bg',
            'et',
            'el',
            'pt',
            'zh',
            'zh-tw',
            'kk',
            'tr',
            'uz',
        ] as const) {
            const md = parser({disableLiquid: true, lang});
            const doc = md.parseDocument('note[^a]\n\n[^a]: text');
            const $ = verify(md.compileDocument(doc));
            expect($('.footnote-backref').text()).toMatch(/\S.+ 1/);
        }
    });

    it.each([true, false])(
        'retains the existing sanitizer policy with allowHTML=%s',
        (allowHTML) => {
            const md = parser({
                disableLiquid: true,
                allowHTML,
                generateID: () => '"<img onerror=evil>&',
            });
            const doc = md.parseDocument(
                'ref[^a]\n\n[^a]: <script>evil()</script>\n\n    [bad](javascript:alert(1)) <img src="x" onerror="evil()">\n\n    - [x] <input autofocus onfocus="evil()">',
            );
            const html = md.compileDocument(doc);
            const $ = verify(html);
            expect(
                $('script, [onerror], [onfocus], [autofocus], a[href^="javascript:"]').length,
            ).toBe(0);
            expect($('.footnote-ref a').attr('id')).toMatch(/^yfm-fn-[a-f0-9_]+-s0-n1-r1$/);
            expect($('.task-list-item input[type="checkbox"][disabled]').length).toBe(1);
        },
    );

    it('fails clearly on authored collisions without committing a candidate namespace', () => {
        const generateID = vi.fn(() => 'x');
        const md = parser({disableLiquid: true, generateID});
        const doc = md.parseDocument('## collision {#yfm-fn-78-s0-n1}\n\nref[^a]\n\n[^a]: body');
        expect(() => md.compileDocument(doc)).toThrow('authored id collides');
        expect(sourceScope(doc.tokens)?.rawOutput?.namespace).toBeUndefined();
        expect(generateID).toHaveBeenCalledTimes(1);
    });

    it('preserves parent resources and source identity when selection validation fails before replay', () => {
        let native: Native | undefined;
        const generateID = vi.fn(() => 'constant');
        const md = parser({
            disableLiquid: true,
            generateID,
            plugins: [
                ...DefaultPlugins,
                (value) => {
                    native = value;
                },
            ],
        });
        const root = md.parseDocument('root');
        if (!native) throw new Error('Missing parser');
        root.env.meta = {script: ['parent.js']};
        const capsule = parseDocumentFragmentResult(
            native,
            '---\nscript: [child.js]\n---\n\nx[^a]\n\n[^a]: child',
            root.env,
            {purpose: 'reference'},
        );
        const original = capsule.tokens.slice();
        const sectionStart = capsule.tokens.findIndex(
            (token) => token.type === 'footnote_block_open',
        );
        expect(() =>
            materializeFootnoteTokens(capsule.tokens, capsule.tokens.slice(0, sectionStart + 1)),
        ).toThrow('Incomplete footnote section');
        expect(root.env.meta.script).toEqual(['parent.js']);
        expect(capsule.tokens).toEqual(original);
        expect(generateID).not.toHaveBeenCalled();
    });

    it('does not repeat caller title renderer effects on stable compile', () => {
        const rendered = vi.fn();
        const md = parser({
            disableLiquid: true,
            extractTitle: true,
            plugins: [
                ...DefaultPlugins,
                (native) => {
                    const render = native.renderer.rules.text;
                    native.renderer.rules.text = (tokens, index, options, env, self) => {
                        if (tokens[index].content === 'Unique title') rendered();
                        return render
                            ? render(tokens, index, options, env, self)
                            : self.renderToken(tokens, index, options);
                    };
                },
            ],
        });
        const doc = md.parseDocument('# Unique title[^a]\n\nbody\n\n[^a]: note');
        md.compileDocument(doc);
        md.compileDocument(doc);
        expect(rendered).toHaveBeenCalledTimes(1);
    });

    it('does not commit namespace or data when sanitization fails', () => {
        const generateID = vi.fn(() => 'consumed');
        const md = parser({
            disableLiquid: true,
            generateID,
            sanitize: () => {
                throw new Error('sanitize failed');
            },
        });
        const doc = md.parseDocument('ref[^a]\n\n[^a]: note');
        const before = doc.tokens.slice();
        expect(() => md.compileDocument(doc)).toThrow('sanitize failed');
        expect(sourceScope(doc.tokens)?.rawOutput?.namespace).toBeUndefined();
        expect(doc.tokens).toEqual(before);
        expect(generateID).toHaveBeenCalledTimes(1);
    });
});

it('preserves child scopes parsed by real term definitions before the root tail', () => {
    const md = parser({disableLiquid: true, generateID: () => 'term'});
    const doc = md.parseDocument(
        'Root[^a]\n\n[^a]: root body\n\n[API](*api)\n\n[*api]: Term[^a]\n[^a]: term body',
    );
    const $ = verify(md.compileDocument(doc));
    expect($('.footnote-item').length).toBe(2);
    expect($('dfn .footnote-item').text()).toContain('term body');
    expect($('.footnote-item').text()).toContain('root body');
});
