import type {HighlightJsApi, Highlighter} from '../src/transform/highlighter';

import {describe, expect, it, vi} from 'vitest';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';

import transform from '../src/transform';
import {createHighlightJsHighlighter} from '../src/transform/highlighter';
import {renderHighlight} from '../src/transform/highlighter/renderer';
import {defineTransformOptions} from '../src/transform/plugin-configuration';
import makeHighlight, {createLegacyHighlighter} from '../src/transform/highlight';
import {log} from '../src/transform/log';

const fence = '```javascript\nconst x = "<script>&";\n```';

function instance() {
    const api = hljs.newInstance();
    api.registerLanguage('javascript', javascript);
    return api;
}

function html(highlighter?: Highlighter, source = fence) {
    return transform(source, {highlighter}).result.html;
}

describe('explicit highlighter', () => {
    it('escapes code by default even with the peer installed and sanitization disabled', () => {
        const output = transform(fence, {needToSanitizeHtml: false}).result.html;
        expect(output).toContain('&lt;script&gt;&amp;');
        expect(output).not.toContain('hljs');
        expect(output).toContain('language-javascript');
    });

    it('preserves terms, prompts, line numbers and wrapping without a highlighter', () => {
        const source =
            '```text prompt="$" showLineNumbers wrap\n$ [HTML](*html) <unsafe>\n```\n\n[*html]: A term';
        const output = transform(source, {codeLineWrapping: true}).result.html;
        expect(output).toContain('yfm-term');
        expect(output).toContain('yfm-code-prompt');
        expect(output).toContain('yfm-line-number');
        expect(output).toContain('language-text wrap');
        expect(output).toContain('&lt;unsafe&gt;');
        expect(output).not.toContain('hljs');
    });

    it('keeps the builder and transform synchronous', () => {
        const options = defineTransformOptions({core: {highlighter: () => ({html: 'example'})}});
        expect(transform(fence, options).result.html).toContain('<code>example</code>');
    });

    it('renders an empty result without substituting source', () => {
        expect(renderHighlight(() => ({html: ''}))('original', 'js')).toBe(
            '<pre><code></code></pre>',
        );
    });

    it('uses escaped fallback for undefined results', () => {
        expect(renderHighlight(() => undefined)('<a>&', 'js')).toBe('&lt;a&gt;&amp;');
    });

    it('escapes class attributes and retains the final sanitizer', () => {
        const callback: Highlighter = () => ({
            html: '<img src=x onerror="evil()">',
            classes: ['x"onclick="evil()'],
        });
        expect(renderHighlight(callback)('', '')).toContain('x&quot;onclick=&quot;evil()');
        expect(html(callback)).not.toContain('onerror');
    });

    it.each([
        null,
        'fragment',
        Promise.resolve('fragment'),
        {},
        {html: 3},
        {html: 'x', classes: ['two words']},
    ])('rejects invalid callback output %s', (result) => {
        expect(() => html((() => result) as unknown as Highlighter)).toThrow(
            /highlighter must return/,
        );
    });

    it('propagates a custom callback failure', () => {
        expect(() =>
            html(() => {
                throw new Error('custom failure');
            }),
        ).toThrow('custom failure');
    });

    it('rejects an asynchronous implementation before installing plugins', () => {
        const setup = vi.fn();
        expect(() =>
            transform('', {
                highlighter: Promise.resolve(() => undefined) as unknown as Highlighter,
                plugins: [setup],
            }),
        ).toThrow(/synchronous/);
        expect(setup).not.toHaveBeenCalled();
    });
});

describe('Highlight.js adapter', () => {
    it.each(['direct', 'default'] as const)(
        'accepts %s modules and preserves old wrapper classes',
        (shape) => {
            const api = instance();
            const callback = createHighlightJsHighlighter(
                shape === 'direct' ? api : {default: api},
            );
            expect(html(callback)).toContain('class="hljs javascript"');
            expect(html(callback)).toContain('hljs-keyword');
        },
    );

    it('accepts a real dynamic import namespace', async () => {
        const module = await import('highlight.js');
        expect(html(createHighlightJsHighlighter(module))).toContain('hljs-keyword');
    });

    it('registers exact factories with the supplied API and keeps instances independent', () => {
        const first = hljs.newInstance();
        const second = hljs.newInstance();
        const factory = vi.fn((api: typeof hljs) => {
            expect(api).toBe(first);
            return {contains: [{begin: /fixture/, className: 'keyword'}]};
        });
        const callback = createHighlightJsHighlighter(first, {languages: {custom: factory}});
        expect(factory).toHaveBeenCalledOnce();
        expect(html(callback, '```custom\nfixture\n```')).toContain('hljs-keyword');
        expect(second.getLanguage('custom')).toBeUndefined();
    });

    it('copies the selection list and requires explicit aliases', () => {
        const allowed = ['javascript'];
        const callback = createHighlightJsHighlighter(instance(), {allowedLanguages: allowed});
        allowed.push('js');
        expect(html(callback)).toContain('hljs-keyword');
        expect(html(callback, '```js\nconst x = 1;\n```')).not.toContain('hljs-keyword');
        expect(
            html(createHighlightJsHighlighter(instance(), {allowedLanguages: []})),
        ).not.toContain('hljs-keyword');
    });

    it.each(['', 'unknown'])('escapes missing or unknown language %s', (language) => {
        const callback = createHighlightJsHighlighter(instance());
        expect(callback('<script>&', language)).toEqual({
            html: '&lt;script&gt;&amp;',
            classes: ['hljs'],
        });
    });

    it.each(['10.0.3', '10.6.0', '10.7.0', '11.12.0', undefined])(
        'selects the documented call and preserves this for %s',
        (versionString) => {
            const api = {
                versionString,
                getLanguage: vi.fn(function (this: unknown) {
                    expect(this).toBe(api);
                    return true;
                }),
                highlight: vi.fn(function (this: unknown) {
                    expect(this).toBe(api);
                    return {value: 'highlighted'};
                }),
            };
            const callback = createHighlightJsHighlighter(api);
            callback('source', 'js');
            expect(api.highlight).toHaveBeenCalledWith(
                ...(versionString === '10.0.3' || versionString === '10.6.0'
                    ? ['js', 'source', true]
                    : ['source', {language: 'js', ignoreIllegals: true}]),
            );
        },
    );

    it.each([
        null,
        {},
        Promise.resolve(instance()),
        {default: {default: instance()}},
        {highlight() {}},
    ])('rejects unsupported module %s', (module) => {
        expect(() => createHighlightJsHighlighter(module as unknown as HighlightJsApi)).toThrow(
            /instance/,
        );
    });

    it('rejects malformed versions and results, but escapes ordinary highlighting failures', () => {
        const api = {getLanguage: () => true, highlight: () => ({value: 'x'})};
        expect(() => createHighlightJsHighlighter({...api, versionString: 'invalid'})).toThrow(
            /versionString/,
        );
        const malformed = createHighlightJsHighlighter({
            ...api,
            highlight: () => ({value: 1}),
        } as unknown as HighlightJsApi);
        expect(() => malformed('source', 'js')).toThrow(/string value/);
        const broken = createHighlightJsHighlighter({
            ...api,
            highlight: () => {
                throw new Error('grammar');
            },
        });
        expect(broken('<source>', 'js')).toEqual({html: '&lt;source&gt;', classes: ['hljs', 'js']});
    });

    it('propagates getLanguage and registration failures', () => {
        const api = {
            getLanguage: () => {
                throw new Error('lookup');
            },
            highlight: () => ({value: ''}),
        };
        expect(() => createHighlightJsHighlighter(api)('', 'js')).toThrow('lookup');
        expect(() =>
            createHighlightJsHighlighter(
                {
                    ...api,
                    registerLanguage() {
                        throw new Error('registration');
                    },
                },
                {languages: {custom: () => ({})}},
            ),
        ).toThrow('registration');
    });
});

describe('highlighter migration', () => {
    it('preserves legacy grammars, exact API identity and scoped diagnostics', () => {
        log.clear();
        const api = instance();
        const callback = createHighlightJsHighlighter(api);
        const factory = vi.fn((received: typeof api) => {
            expect(received).toBe(api);
            return {contains: [{begin: /fixture/, className: 'keyword'}]};
        });
        const warn = vi.fn();
        for (let index = 0; index < 2; index++) {
            const output = transform('```custom\nfixture\n```', {
                disableLiquid: true,
                highlighter: callback,
                highlightLangs: {custom: factory},
                log: {warn, info: vi.fn(), error: vi.fn()},
                path: 'guide.md',
            });
            expect(output.result.html).toContain('hljs-keyword');
            expect(output.logs.warn.join()).toContain('HIGHLIGHT_LANGS');
        }
        expect(warn).toHaveBeenCalledTimes(2);
        expect(warn.mock.calls[0][0]).toContain('guide.md');
    });

    it('does not warn for an empty map and rejects nonempty maps without an adapter', () => {
        const warn = vi.fn();
        transform('', {
            disableLiquid: true,
            highlightLangs: {},
            log: {warn, info: vi.fn(), error: vi.fn()},
        });
        expect(warn).not.toHaveBeenCalled();
        expect(() => transform('', {highlightLangs: {custom: () => ({})}})).toThrow(
            /explicit highlighter/,
        );
        expect(() =>
            transform('', {highlighter: () => undefined, highlightLangs: {custom: () => ({})}}),
        ).toThrow(/explicit highlighter/);
    });

    it('preserves explicit legacy factory and old callable shapes with a warning', () => {
        const warn = vi.fn();
        expect(
            html(createLegacyHighlighter({}, {log: {warn, info: vi.fn(), error: vi.fn()}})),
        ).toContain('hljs-keyword');
        expect(
            makeHighlight({}, {log: {warn, info: vi.fn(), error: vi.fn()}})(
                'const x = 1;',
                'javascript',
            ),
        ).toContain('<pre><code class="hljs javascript">');
        expect(warn).toHaveBeenCalledTimes(2);
        expect(warn.mock.calls[0][0]).toContain('LEGACY_HIGHLIGHTER_FACTORY');
    });
});
