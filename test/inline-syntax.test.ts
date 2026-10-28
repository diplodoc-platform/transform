import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {MarkdownIt as TransformMarkdownIt} from '../src/transform/typings';

import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import ins from 'markdown-it-ins';
import {load} from 'cheerio';
import {describe, expect, it, vi} from 'vitest';

import transform from '../src/transform';
import linkifyStrikethrough from '../src/transform/plugins/linkify-strikethrough';
import subscript from '../src/transform/plugins/subscript';
import sup from '../src/transform/plugins/sup';
import term from '../src/transform/plugins/term';
import underline from '../src/transform/plugins/underline';

function parser(withAttrs: boolean, withUnderline = true, withSubscript = true) {
    const md = new MarkdownIt({linkify: true, html: true});
    md.use(linkifyStrikethrough);
    if (withAttrs) {
        md.use(attrs);
    }
    if (withUnderline) {
        md.use(underline);
    }
    if (withSubscript) {
        md.use(subscript);
    }
    return md;
}

const corpus = [
    ['++text++', '<u>text</u>'],
    ['++**bold** and _em_++', '<u><strong>bold</strong> and <em>em</em></u>'],
    ['++[link](/target)++', '<u><a href="/target">link</a></u>'],
    ['a++b++c', 'a<u>b</u>c'],
    ['+++x+++', '+<u>x</u>+'],
    ['++ x ++', '++ x ++'],
    ['++x', '++x'],
    ['x++', 'x++'],
    ['\\+\\+x++', '++x++'],
    [
        '_em_ __strong__ *em* **strong**',
        '<em>em</em> <strong>strong</strong> <em>em</em> <strong>strong</strong>',
    ],
    ['~~strike~~', '<s>strike</s>'],
    ['~~~x~~~', '~<s>x</s>~'],
    ['~~~~x~~~~', '<s><s>x</s></s>'],
    ['H~2~O', 'H<sub>2</sub>O'],
    ['~а😀~', '<sub>а😀</sub>'],
    ['~a b~', '~a b~'],
    ['~a\\ b~', '<sub>a b</sub>'],
    ['~a\nb~', '~a\nb~'],
    ['~**x**~', '<sub>**x**</sub>'],
    ['~[x](/url)~', '<sub>[x](/url)</sub>'],
    ['\\~x~', '~x~'],
    ['~x', '~x'],
    ['x~', 'x~'],
    ['~~', '~~'],
    ['++H~2~O++', '<u>H<sub>2</sub>O</u>'],
    ['~++x++~', '<sub>++x++</sub>'],
    ['`++x++ ~y~`', '<code>++x++ ~y~</code>'],
    ['++https://example.com++', '<u><a href="https://example.com">https://example.com</a></u>'],
    ['~~https://example.com~~', '<s><a href="https://example.com">https://example.com</a></s>'],
    ['_https://example.com_', '<em>https://example.com</em>'],
    [
        '++~~https://example.com~~++',
        '<u><s><a href="https://example.com">https://example.com</a></s></u>',
    ],
    [
        '++https://example.com/a++++',
        '<u><a href="https://example.com/a++">https://example.com/a++</a></u>',
    ],
    ['https://example.com/a++', '<a href="https://example.com/a++">https://example.com/a++</a>'],
    [
        '\\+\\+https://example.com/a++',
        '++<a href="https://example.com/a++">https://example.com/a++</a>',
    ],
    [
        '+++https://example.com+++',
        '+<u><a href="https://example.com+">https://example.com+</a></u>',
    ],
    ['++https://example.com+', '++<a href="https://example.com+">https://example.com+</a>'],
    [
        'https://example.com/a++b++',
        '<a href="https://example.com/a++b++">https://example.com/a++b++</a>',
    ],
    [
        '++<https://example.com/a++>++',
        '<u><a href="https://example.com/a++">https://example.com/a++</a></u>',
    ],
    ['~https://example.com~', '<sub>https://example.com</sub>'],
] as const;

describe.each([false, true])('native MarkdownIt 15 inline syntax (attrs=%s)', (withAttrs) => {
    it.each(corpus)('renders %s', (source, html) => {
        expect(parser(withAttrs).renderInline(source)).toBe(html);
    });

    it('keeps block lists and tilde fences', () => {
        const md = parser(withAttrs);
        expect(md.render('+ item')).toBe('<ul>\n<li>item</li>\n</ul>\n');
        expect(md.render('~~~\n++x++ ~y~\n~~~')).toBe('<pre><code>++x++ ~y~\n</code></pre>\n');
        expect(md.render('    ++x++ ~y~')).toBe('<pre><code>++x++ ~y~\n</code></pre>\n');
    });

    it.each([
        ['++https://example.com++', true, 'https://example.com', 'https://example.com'],
        ['+++https://example.com+++', true, 'https://example.com+', 'https://example.com+'],
        ['++https://example.com/a++++', true, 'https://example.com/a++', 'https://example.com/a++'],
        ['https://example.com/a++', true, 'https://example.com/a++', 'https://example.com/a++'],
        ['https://example.com/a++', false, 'https://example.com/a++', 'https://example.com/a++'],
        ['++https://example.com++', false, null, '++https://example.com++'],
    ])(
        'preserves exact native URL token data for %s (underline=%s)',
        (source, installed, href, visible) => {
            const children = parser(withAttrs, installed).parseInline(source, {})[0].children || [];
            const linkIndex = children.findIndex((token) => token.type === 'link_open');
            if (href === null) {
                expect(linkIndex).toBe(-1);
                expect(children.map((token) => token.content).join('')).toBe(visible);
                expect(children.some((token) => token.type === 'underline_open')).toBe(false);
            } else {
                expect(children[linkIndex].attrGet('href')).toBe(href);
                expect(children[linkIndex + 1].type).toBe('text');
                expect(children[linkIndex + 1].content).toBe(visible);
                expect(children[linkIndex + 2].type).toBe('link_close');
            }
        },
    );

    it('preserves attrs attachment policy', () => {
        expect(parser(withAttrs).render('++x++{.mark} H~2~O{.chem}')).toBe(
            withAttrs
                ? '<p class="chem"><u class="mark">x</u> H<sub>2</sub>O</p>\n'
                : '<p><u>x</u>{.mark} H<sub>2</sub>O{.chem}</p>\n',
        );
    });

    it('preserves paired feature tokens inside links', () => {
        expect(parser(withAttrs).renderInline('[++H~2~O++](/target)')).toBe(
            '<a href="/target"><u>H<sub>2</sub>O</u></a>',
        );
    });

    it('retags only its own paired delimiter tokens', () => {
        const md = parser(withAttrs);
        md.inline.ruler2.before('yfm_underline', 'external-ins', (state) => {
            state.tokens.push(new MarkdownIt.Token('ins_open', 'ins', 1));
            state.tokens.push(new MarkdownIt.Token('ins_close', 'ins', -1));
        });
        expect(md.renderInline('++x++')).toBe('<u>x</u><ins></ins>');
    });

    it('supports native repeated calls with one env and preserves underline-disabled URLs', () => {
        const md = parser(withAttrs);
        const env = {};
        for (let index = 0; index < 3; index++) {
            expect(md.renderInline('++https://example.com++ H~2~O', env)).toBe(
                '<u><a href="https://example.com">https://example.com</a></u> H<sub>2</sub>O',
            );
        }
        expect(env).toEqual({});
        expect(parser(withAttrs, false).renderInline('++https://example.com++')).toBe(
            '++https://example.com++',
        );
        expect(parser(withAttrs, true, false).renderInline('H~2~O ~~x~~')).toBe('H~2~O <s>x</s>');
    });
});

describe('Transform explicit inline callback composition', () => {
    it.each([false, true])(
        'preserves existing sup and terms with attrs=%s',
        (enableMarkdownAttrs) => {
            const plugins = [sup, term, underline, subscript];
            const source = '^2^ ^[a]^b^ ++[term](*key)++ H~2~O\n\n[*key]: Definition';
            const {html} = transform(source, {plugins, enableMarkdownAttrs}).result;
            expect(html).toContain('<sup>2</sup> <sup>[a]</sup>b^');
            expect(html).toContain('<u>');
            expect(html).toContain('Definition');
            expect(html).toContain('H<sub>2</sub>O');
        },
    );

    it.each([false, true])('retains sanitizer and HTML policy with allowHTML=%s', (allowHTML) => {
        const source = '++<img src="x" onerror="alert(1)">++ ~<x>~ ++[bad](javascript:alert(1))++';
        const {html} = transform(source, {plugins: [underline, subscript], allowHTML}).result;
        expect(load(html)('img').attr('onerror')).toBeUndefined();
        expect(html).not.toContain('href="javascript:');
        expect(html).toContain('<u>');
        expect(html).toContain('<sub>&lt;x&gt;</sub>');
    });

    it('keeps explicit none and legacy empty callbacks free of underline effects', () => {
        const source = '++https://example.com++ H~2~O ~~https://example.com~~';
        const legacy = transform(source, {plugins: [], linkify: true}).result.html;
        const none = transform(source, {pluginConfiguration: {preset: 'none'}, linkify: true})
            .result.html;
        expect(none).toBe(legacy);
        expect(legacy).toContain('++https://example.com++');
        expect(legacy).not.toContain('<u>');
        expect(legacy).not.toContain('<sub>');
        expect(legacy).toContain('<s><a href="https://example.com">');
    });

    it('does not override third-party inserted-text renderers', () => {
        const md = parser(false);
        md.renderer.rules.ins_open = () => '<ins class="external">';
        const tokens = [
            new MarkdownIt.Token('ins_open', 'ins', 1),
            new MarkdownIt.Token('ins_close', 'ins', -1),
        ];
        expect(md.renderer.render(tokens, md.options, {})).toBe('<ins class="external"></ins>');
        expect(md.renderInline('++x++')).toBe('<u>x</u>');
    });

    it.each([
        ['+++x+++', '+<ins>x</ins>+<ins></ins>'],
        ['[+++x+++](/target)', '<a href="/target">+<ins>x</ins>+</a><ins></ins>'],
    ])('probes the pinned private postprocessor boundary for %s', (source, html) => {
        const md = new MarkdownIt().use(ins);
        const state = new MarkdownIt.StateInline(source, md, {}, []);
        md.inline.tokenize(state);
        const balancePairs = md.inline.ruler2.__rules__.find(
            (rule) => rule.name === 'balance_pairs',
        );
        const postprocessor = md.inline.ruler2.__rules__.find((rule) => rule.name === 'ins');
        if (!balancePairs || !postprocessor) {
            throw new Error('Expected pinned native balance and ins postprocessor rules');
        }
        balancePairs.fn(state);

        const ownedTokens = new Set<Token>();
        const delimiterLists = [
            state.delimiters,
            ...state.tokens_meta.flatMap((meta) => (meta?.delimiters ? [meta.delimiters] : [])),
        ];
        for (const delimiters of delimiterLists) {
            for (const delimiter of delimiters) {
                if (delimiter.end !== -1) {
                    ownedTokens.add(state.tokens[delimiter.token]);
                    ownedTokens.add(state.tokens[delimiters[delimiter.end].token]);
                }
            }
        }
        const foreignTokens = [
            Object.freeze(new MarkdownIt.Token('ins_open', 'ins', 1)),
            Object.freeze(new MarkdownIt.Token('ins_close', 'ins', -1)),
        ];
        const modifiedTokens = new Set<Token>();
        const tokens = [...state.tokens, ...foreignTokens].map(
            (token) =>
                new Proxy(token, {
                    set(target, property, value) {
                        if (!ownedTokens.has(target)) {
                            throw new Error(
                                `Unexpected foreign token mutation: ${String(property)}`,
                            );
                        }
                        modifiedTokens.add(target);
                        return Reflect.set(target, property, value);
                    },
                }),
        );
        const delimiters = state.delimiters.map((delimiter) => Object.freeze({...delimiter}));
        const metadata = state.tokens_meta.map((meta) =>
            meta?.delimiters
                ? Object.freeze({
                      delimiters: meta.delimiters.map((delimiter) => Object.freeze({...delimiter})),
                  })
                : undefined,
        );
        const input = {tokens, delimiters, tokens_meta: metadata};
        const fields = new Set(['tokens', 'delimiters', 'tokens_meta']);
        const reads = new Set<string>();
        const boundary = new Proxy(input, {
            get(target, property, receiver) {
                if (typeof property !== 'string' || !fields.has(property)) {
                    throw new Error(`Unexpected postprocessor field: ${String(property)}`);
                }
                reads.add(property);
                return Reflect.get(target, property, receiver);
            },
            set() {
                throw new Error('The postprocessor must not replace input fields');
            },
            defineProperty() {
                throw new Error('The postprocessor must not add input fields');
            },
            deleteProperty() {
                throw new Error('The postprocessor must not delete input fields');
            },
        });
        Reflect.apply(postprocessor.fn, undefined, [boundary]);

        expect(reads).toEqual(fields);
        expect(modifiedTokens).toEqual(ownedTokens);
        expect(tokens.slice(-2).map((token) => token.type)).toEqual(['ins_open', 'ins_close']);
        expect(md.renderer.render(tokens, md.options, {})).toBe(html);
        expect(delimiters).toEqual(state.delimiters);
        expect(metadata).toEqual(
            state.tokens_meta.map((meta) =>
                meta?.delimiters ? {delimiters: meta.delimiters} : undefined,
            ),
        );
    });

    it('preserves third-party ins rules with colliding upstream names', () => {
        const md = new MarkdownIt({linkify: true});
        const tokenizer = vi.fn(() => false);
        const postprocessor = vi.fn();
        md.inline.ruler.before('emphasis', 'ins', tokenizer);
        md.inline.ruler2.before('emphasis', 'ins', postprocessor);
        md.use(underline);
        expect(md.inline.ruler.__rules__.find((rule) => rule.name === 'ins')?.fn).toBe(tokenizer);
        expect(md.inline.ruler2.__rules__.find((rule) => rule.name === 'ins')?.fn).toBe(
            postprocessor,
        );
        expect(md.renderInline('+++x+++')).toBe('+<u>x</u>+');
        expect(tokenizer).toHaveBeenCalled();
        expect(postprocessor).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['++x++', '<ins>x</ins>'],
        ['+++x+++', '+<ins>x</ins>+'],
        ['[+++x+++](/target)', '<a href="/target">+<ins>x</ins>+</a>'],
    ])('preserves earlier ins tokenizer precedence for %s', (source, html) => {
        const md = new MarkdownIt().use(ins).use(underline);
        expect(md.renderInline(source)).toBe(html);
    });

    it.each(['++x++', '+++x+++', '[+++x+++](/target)'])(
        'rejects incompatible ins installed after underline for %s',
        (source) => {
            const md = new MarkdownIt().use(underline).use(ins);
            expect(() => md.renderInline(source)).toThrow(
                'ins parser installed after underline conflicts',
            );
        },
    );

    it('allows a disabled later ins parser without changing underline output', () => {
        const md = new MarkdownIt().use(underline).use(ins);
        expect(() => md.renderInline('+++x+++')).toThrow(
            'ins parser installed after underline conflicts',
        );
        md.disable('ins');
        expect(md.renderInline('+++x+++')).toBe('+<u>x</u>+');
    });

    it('rejects an internal rule-name collision before changing native rules', () => {
        const md = new MarkdownIt();
        md.inline.ruler.before('emphasis', 'yfm_underline', () => false);
        const tokenizers = [...md.inline.ruler.__rules__];
        const postprocessors = [...md.inline.ruler2.__rules__];
        expect(() => md.use(underline)).toThrow('already installed');
        expect(md.inline.ruler.__rules__).toEqual(tokenizers);
        expect(md.inline.ruler2.__rules__).toEqual(postprocessors);
    });

    it.each([
        ['++x++', '++x++'],
        ['a++b++c', 'a++b++c'],
        ['+++x+++', '+++x+++'],
        ['++https://example.com++', '++https://example.com++'],
        ['H~2~O', 'H~2~O'],
        ['~~x~~', '<s>x</s>'],
        ['~~~x~~~', '~<s>x</s>~'],
        [
            'https://example.com/a++',
            '<a href="https://example.com/a++">https://example.com/a++</a>',
        ],
    ])('matches the actual bare parser baseline for disabled syntax: %s', (source, html) => {
        expect(new MarkdownIt({linkify: true}).renderInline(source)).toBe(html);
        expect(parser(false, false, false).renderInline(source)).toBe(html);
    });

    it('preserves the native helper rule name and idempotent installation', () => {
        const md = parser(false);
        linkifyStrikethrough(md as TransformMarkdownIt, {underline: true});
        linkifyStrikethrough(md as TransformMarkdownIt, {underline: true});
        expect(md.renderInline('++https://example.com++')).toContain('<u><a href=');
        md.disable('linkify');
        expect(md.renderInline('++https://example.com++')).toBe('<u>https://example.com</u>');
    });
});
