import type {MarkdownIt} from '../src/transform/shared-types';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};

import {describe, expect, it} from 'vitest';

import parser from '../src/transform/md';
import DefaultPlugins from '../src/transform/plugins';
import {materializeFootnoteTokens, parseDocumentFragmentResult} from '../src/transform/document';
import {sourceScope} from '../src/transform/footnote-data';
import {footnoteService} from '../src/transform/document-context-core';

class Metadata {
    readonly value: string;
    constructor(value: string) {
        this.value = value;
    }
    describe() {
        return this.value;
    }
}
const customSymbol = Symbol('consumer-private');
const cases = [
    ['Date', () => new Date('2020-01-01T00:00:00Z')],
    ['class', () => new Metadata('owned')],
    ['array', () => ['one', 'two']],
    [
        'descriptor',
        () =>
            Object.defineProperties(
                {plain: true},
                {
                    hidden: {value: 'hidden', enumerable: false},
                    [customSymbol]: {value: 'symbol', enumerable: false},
                },
            ),
    ],
] as const;

function setup(payload: object) {
    let native: MarkdownIt | undefined;
    const custom = {owned: true};
    let fail = false;
    const rendered: Token[] = [];
    const decorate = (md: MarkdownIt) => {
        native = md;
        md.core.ruler.before('footnote_tail', 'consumer-metadata', (state) => {
            for (const token of state.tokens)
                if (token.type === 'paragraph_open') {
                    Reflect.set(token, 'meta', payload);
                    Object.defineProperty(token, 'consumerHidden', {
                        value: custom,
                        enumerable: false,
                        writable: false,
                        configurable: false,
                    });
                    Object.defineProperty(token, customSymbol, {
                        value: custom,
                        enumerable: false,
                        writable: false,
                        configurable: false,
                    });
                }
        });
        md.renderer.rules.paragraph_open = (tokens, index) => {
            const token = tokens[index];
            rendered.push(token);
            expect(token.meta).toBe(payload);
            expect(Reflect.get(token, 'consumerHidden')).toBe(custom);
            expect(Reflect.get(token, customSymbol)).toBe(custom);
            expect(Object.getOwnPropertyDescriptor(token, 'consumerHidden')).toEqual({
                value: custom,
                enumerable: false,
                writable: false,
                configurable: false,
            });
            if (fail) throw new Error('consumer render failed');
            return '<p>META ';
        };
    };
    const owned = parser({disableLiquid: true, plugins: [...DefaultPlugins, decorate]});
    return {
        owned,
        rendered,
        get native() {
            if (!native) throw new Error('missing native');
            return native;
        },
        fail() {
            fail = true;
        },
    };
}

describe.each(cases)('arbitrary metadata: %s', (_name, make) => {
    it('is an actual no-op without footnotes, including token identity', () => {
        const payload = make();
        const context = setup(payload);
        const document = context.owned.parseDocument('plain');
        expect(sourceScope(document.tokens)).toBeUndefined();
        expect(footnoteService(document.env)).toBeUndefined();
        expect(materializeFootnoteTokens(document.tokens)).toBe(document.tokens);
        expect(context.owned.compileDocument(document)).toContain('META plain');
        expect(context.rendered[0]).toBe(document.tokens[0]);
        expect(document.tokens[0].meta).toBe(payload);
        context.fail();
        expect(() => context.owned.compileDocument(document)).toThrow('consumer render failed');
        expect(footnoteService(document.env)).toBeUndefined();
    });
    it('preserves metadata and property descriptors in body copies and repeated selected capsules', () => {
        const payload = make();
        const context = setup(payload);
        const document = context.owned.parseDocument('Root[^a]\n\n[^a]: root body');
        const child = parseDocumentFragmentResult(
            context.native,
            'Child[^a]\n\n[^a]: child body',
            document.env,
            {purpose: 'reference'},
        );
        const original = child.tokens.slice();
        const paragraphs = child.tokens.filter((token) => token.type === 'paragraph_open');
        const descriptors = paragraphs.map((token) => Object.getOwnPropertyDescriptors(token));
        document.tokens.push(
            ...materializeFootnoteTokens(child.tokens, child.tokens.slice(0, 3)),
            ...materializeFootnoteTokens(child.tokens, child.tokens.slice(0, 3)),
        );
        const html = context.owned.compileDocument(document);
        expect(context.owned.compileDocument(document)).toBe(html);
        expect(child.tokens).toEqual(original);
        paragraphs.forEach((token, index) => {
            expect(token.meta).toBe(payload);
            expect(Object.getOwnPropertyDescriptors(token)).toEqual(descriptors[index]);
            expect(context.rendered).not.toContain(token);
            expect(Object.getPrototypeOf(context.rendered[0])).toBe(Object.getPrototypeOf(token));
        });
        context.fail();
        expect(() => context.owned.compileDocument(document)).toThrow('consumer render failed');
        paragraphs.forEach((token, index) =>
            expect(Object.getOwnPropertyDescriptors(token)).toEqual(descriptors[index]),
        );
    });
});

it('retains user metadata on feature tokens after ownership capture and supports frozen capsules', () => {
    const payload = new Metadata('feature');
    let native: MarkdownIt | undefined;
    const decorate = (md: MarkdownIt) => {
        native = md;
        md.core.ruler.push('replace-owned-token-meta', (state) => {
            const walk = (tokens: Token[]) => {
                for (const token of tokens) {
                    if (token.type.startsWith('footnote_')) Reflect.set(token, 'meta', payload);
                    if (token.children) walk(token.children);
                }
            };
            walk(state.tokens);
        });
    };
    const owned = parser({disableLiquid: true, plugins: [...DefaultPlugins, decorate]});
    const root = owned.parseDocument('plain');
    if (!native) throw new Error('missing parser');
    const child = parseDocumentFragmentResult(native, 'Child[^a]\n\n[^a]: body', root.env, {
        purpose: 'reference',
    });
    const freeze = (tokens: Token[]) => {
        for (const token of tokens) {
            if (token.children) freeze(token.children);
            Object.freeze(token);
        }
    };
    freeze(child.tokens);
    root.tokens.push(...materializeFootnoteTokens(child.tokens));
    expect(owned.compileDocument(root)).toContain('footnote-item');
    expect(child.tokens.find((token) => token.type === 'footnote_open')?.meta).toBe(payload);
});
