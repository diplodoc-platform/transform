import type {MarkdownIt, ParserEnv} from '../src/transform/typings';
import type {ParsedDocumentFragment} from '../src/transform/document';

import {vi} from 'vitest';
import NativeMarkdownIt from 'markdown-it';

import parser from '../src/transform/md';
import meta from '../src/transform/plugins/meta';
import log from '../src/transform/log';
import {
    createDocumentEnv,
    parseDocumentFragment,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from '../src/transform/document';
import {preprocess} from '../src/transform/preprocessors';

function setup() {
    let native!: MarkdownIt;
    let parsedEnv!: ParserEnv;
    const generateID = vi.fn(() => 'id');
    const parse = vi.fn();
    parser({
        plugins: [
            (md, options) => {
                native = md;
                md.core.ruler.push('contributions', (state) => {
                    parse();
                    options.generateID?.();
                    const env = state.env as ParserEnv;
                    parsedEnv = env;
                    env.meta = {
                        title: 'child',
                        script: ['child.js'],
                        style: ['child.css'],
                        csp: [{'script-src': ['child']}],
                        visibilityAudiences: ['agent'],
                    };
                    env.assets = ['child.png'];
                    env.additionalOptionsCssWhiteList = {color: true};
                    env.terms = {...env.terms, child: 'definition'};
                    env.included = {...env.included, child: 'source'};
                });
            },
        ],
        generateID,
    });
    return {native, parse, generateID, child: () => parsedEnv};
}

test('cache replay captures child deltas, promotes references, and retains mutable tokens', () => {
    const {native, parse, generateID, child} = setup();
    const a = createDocumentEnv();
    a.meta = {title: 'A'};
    a.terms = {parentOnly: 'A'};
    a.included = {parentOnly: 'A'};
    const fragment = parseDocumentFragmentResult(native, 'body', a, {purpose: 'reference'});
    expect(a.meta).toEqual({title: 'A'});
    expect(a.assets).toBeUndefined();
    expect(a.terms).toEqual({parentOnly: 'A'});
    const tokens = fragment.tokens;
    tokens[0].tag = 'mutated';
    child().meta?.script?.push('later-child-mutation');
    child().meta?.csp?.[0]['script-src'].push('later-child-mutation');
    child().assets?.push('later-child-mutation');
    Object.assign(child().additionalOptionsCssWhiteList ?? {}, {later: true});
    const b = createDocumentEnv();
    b.meta = {title: 'B', visibilityAudiences: ['human']};
    b.terms = {child: 'parent wins'};
    b.included = {child: 'parent wins'};
    for (let i = 0; i < 2; i++) {
        replayDocumentFragment(native, fragment, b, {purpose: 'include'});
    }
    expect(b.meta).toEqual({
        title: 'B',
        script: ['child.js'],
        style: ['child.css'],
        csp: [{'script-src': ['child']}],
        visibilityAudiences: ['human', 'agent'],
    });
    expect(b.assets).toEqual(['child.png']);
    expect(b.additionalOptionsCssWhiteList).toEqual({color: true});
    expect(b.terms).toEqual({child: 'parent wins'});
    expect(b.included).toEqual({child: 'parent wins'});
    expect(fragment.tokens).toBe(tokens);
    expect(fragment.tokens[0].tag).toBe('mutated');
    expect(parse).toHaveBeenCalledTimes(1);
    expect(generateID).toHaveBeenCalledTimes(1);
    b.meta?.csp?.[0]['script-src'].push('later-parent-mutation');
    b.assets?.push('later-parent-mutation');
    Object.assign(b.additionalOptionsCssWhiteList ?? {}, {later: true});
    const c = createDocumentEnv();
    replayDocumentFragment(native, fragment, c, {purpose: 'fragment'});
    expect(c.assets).toEqual(['child.png']);
    expect(c.meta?.csp).toEqual([{'script-src': ['child']}]);
    expect(c.meta?.visibilityAudiences).toEqual(['agent']);
    expect(c.additionalOptionsCssWhiteList).toEqual({color: true});
    expect(c.terms).toBeUndefined();
    expect(c.included).toEqual({});
    replayDocumentFragment(native, fragment, c, {purpose: 'include'});
    expect(c.terms).toEqual({child: 'definition'});
    expect(c.included).toEqual({child: 'source'});
});

test('failed replay validates before mutation and is retryable; ownership cannot be forged', () => {
    const {native} = setup();
    const fragment = parseDocumentFragmentResult(native, 'body', createDocumentEnv(), {
        purpose: 'reference',
    });
    const parent = createDocumentEnv();
    parent.meta = {};
    Object.assign(parent.meta, {script: [], style: 'custom frontmatter'});
    parent.assets = ['parent.png'];
    const meta = parent.meta;
    const assets = parent.assets;
    expect(() => replayDocumentFragment(native, fragment, parent, {purpose: 'include'})).toThrow(
        'meta.style',
    );
    expect(parent.meta).toBe(meta);
    expect(parent.meta).toEqual({script: [], style: 'custom frontmatter'});
    expect(parent.assets).toBe(assets);
    expect(parent.terms).toBeUndefined();
    parent.meta = {};
    replayDocumentFragment(native, fragment, parent, {purpose: 'include'});
    expect(parent.assets).toEqual(['parent.png', 'child.png']);
    expect(() =>
        replayDocumentFragment(setup().native, fragment, parent, {purpose: 'reference'}),
    ).toThrow('configured parser');
    expect(() =>
        replayDocumentFragment(
            native,
            {tokens: fragment.tokens} as ParsedDocumentFragment,
            parent,
            {purpose: 'include'},
        ),
    ).toThrow('configured parser');
});

test('preparation runs inside child frame, retains nested materialized content and rejects async output', () => {
    let native!: MarkdownIt;
    parser({
        plugins: [
            (md) => {
                native = md;
            },
        ],
    });
    const parent = createDocumentEnv();
    parent.included = {parent: 'preserved'};
    const source = '{% included(grand.md) %}\n# Grandchild\n{% endincluded %}\nchild';
    const prepare = vi.fn((input: string) =>
        preprocess(input, {root: '/docs', path: '/docs/child.md'}, undefined, native),
    );
    const fragment = parseDocumentFragmentResult(
        native,
        source,
        parent,
        {purpose: 'reference', path: '/docs/child.md'},
        prepare,
    );
    expect(parent.included).toEqual({parent: 'preserved'});
    expect(fragment.tokens.some((token) => token.content === 'child')).toBe(true);
    replayDocumentFragment(native, fragment, parent, {purpose: 'include'});
    expect(parent.included?.['/docs/grand.md']).toContain('# Grandchild');
    expect(prepare).toHaveBeenCalledTimes(1);
    const bad = (() => Promise.resolve('body')) as unknown as (source: string) => string;
    expect(() =>
        parseDocumentFragmentResult(native, 'body', parent, {purpose: 'include'}, bad),
    ).toThrow('synchronously return a string');
    expect(parent.included?.parent).toBe('preserved');
    expect(parseDocumentFragment(native, 'body', parent, {purpose: 'fragment'})).toHaveLength(3);
});

test('failed initial merge preserves the previous native document until a complete child result succeeds', () => {
    const native = new NativeMarkdownIt().use(meta, {
        path: '',
        root: '',
        rootPublicPath: '',
        lang: 'en',
        log,
        isLintRun: false,
    }) as MarkdownIt;
    native.core.ruler.push('resources', (state) => {
        const env = state.env as ParserEnv;
        env.assets = [state.src === 'child' ? '/child.png' : '/A.png'];
        if (state.src === 'child') {
            Object.assign((env.meta ??= {}), {script: ['/child.js']});
        }
    });
    native.render('---\nname: A\n---\nA');
    const previousMeta = native.meta;
    const previousAssets = native.assets;
    const invalid = createDocumentEnv();
    invalid.meta = {};
    Object.assign(invalid.meta, {script: 'invalid'});
    let failed: ParsedDocumentFragment | undefined;
    expect(() => {
        failed = parseDocumentFragmentResult(native, 'child', invalid, {purpose: 'include'});
    }).toThrow('meta.script');
    expect(failed).toBeUndefined();
    expect(native.meta).toBe(previousMeta);
    expect(native.assets).toBe(previousAssets);
    expect(native.meta).toEqual({name: 'A'});
    expect(native.assets).toEqual(['/A.png']);
    expect(invalid.meta).toEqual({script: 'invalid'});
    expect(invalid.assets).toBeUndefined();
    const valid = createDocumentEnv();
    const fragment = parseDocumentFragmentResult(native, 'child', valid, {purpose: 'include'});
    expect(fragment.tokens).toHaveLength(3);
    expect(native.meta).toBe(valid.meta);
    expect(native.assets).toBe(valid.assets);
    expect(valid.meta).toEqual({script: ['/child.js']});
    expect(valid.assets).toEqual(['/child.png']);
});
