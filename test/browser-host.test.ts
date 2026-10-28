import {buildSync} from 'esbuild';
import MarkdownIt from 'markdown-it';
import {vi} from 'vitest';

import nodeSanitize, {defaultOptions} from '../src/transform/sanitize';
import nodeLog from '../src/transform/log';
import nodeParser from '../src/transform/md';
import {createParser} from '../src/transform/parser-core';
import {resolvePluginConfiguration} from '../src/transform/plugin-registry-core';
import {createBrowserHost} from '../src/transform/browser/host';
import {BrowserUnsupportedFeatureError} from '../src/transform/browser/errors';
import meta from '../src/transform/plugins/meta';
import {createSanitizer} from '../src/transform/sanitize-core';
import {browserCss} from '../src/transform/browser/css';
import {createBrowserReporter, log} from '../src/transform/browser/diagnostics';
import {
    createDocumentEnv,
    envMeta,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from '../src/transform/browser/document';

const browserSanitize = createSanitizer(browserCss, log).sanitize;

beforeEach(() => {
    log.clear();
    nodeLog.clear();
});

test.each([
    '<p onclick="bad()"><a href="javascript:bad()">text</a><script>bad()</script></p>',
    '<p style="color:red;position:fixed;width:20px">text</p>',
    '<style>p {color: red; width:20px} @import "bad.css";</style><p>text</p>',
    '<style>p {color: red} /*# sourceMappingURL=file:///never/read.map */</style>',
    '<style>p {color:red;</style><p>text</p>',
    '<p style="background:url(javascript:bad());--safe:20px">text</p>',
    '<p style="background:u\\72l(j\\61vascript:bad())">text</p>',
    '<svg><use href="https://example.test/bad.svg#x"></use><use href="#x"></use></svg>',
    '<svg><path id="x" d="M0 0h20" stroke="red"/></svg>',
    '<img src="image.svg" width="20" height="30" alt="Image"><h2 id="stable">Title</h2>',
])('real browser CSS adapter retains Node sanitizer policy: %s', (html) => {
    const result = browserSanitize(html, {...defaultOptions});
    expect(nodeLog.isEmpty()).toBe(true);
    expect(result).toBe(nodeSanitize(html, {...defaultOptions}));
});

test('browser CSS graph uses the real parser and identity compiler without Node branches', () => {
    const result = buildSync({
        entryPoints: ['src/transform/browser/css.ts'],
        platform: 'browser',
        bundle: true,
        format: 'esm',
        write: false,
        metafile: true,
    });
    const inputs = Object.keys(result.metafile.inputs);
    expect(inputs).toContain('node_modules/css/lib/parse/index.js');
    expect(inputs).toContain('node_modules/css/lib/stringify/identity.js');
    expect(
        inputs.some((path) => /(?:source-map|sourcemap|disabled|[/\\]fs(?:\.|$))/.test(path)),
    ).toBe(false);
    expect(Object.values(result.metafile.outputs).flatMap(({imports}) => imports)).toEqual([]);
});

test('browser reporters collect plain messages and forward each explicit document scope', () => {
    const consumer = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    const descriptor = {
        code: 'BROWSER_HOST',
        feature: 'Legacy input',
        replacement: 'current input',
        removal: {version: '6.0.0'},
    };
    for (let i = 0; i < 2; i++) {
        const reporter = createBrowserReporter({log: consumer});
        reporter.warn(descriptor, {option: 'legacy'});
        reporter.warn(descriptor, {option: 'legacy'});
    }
    expect(consumer.warn).toHaveBeenCalledTimes(2);
    expect(log.get().warn).toHaveLength(1);
    expect(log.get().warn[0]).toMatch(/^WARN \[DEPRECATED BROWSER_HOST\]/);
    expect(log.get().warn[0]).not.toContain('\u001b');
    expect(nodeLog.isEmpty()).toBe(true);
});

test('browser helpers retain canonical capsule ownership and plain native fallback diagnostics', () => {
    const md = new MarkdownIt().use(envMeta);
    const parent = createDocumentEnv();
    parent.meta = {title: 'parent'};
    const fragment = parseDocumentFragmentResult(
        md,
        '---\nstyle: [child.css]\n---\nchild',
        parent,
        {purpose: 'reference'},
    );
    expect(parent.meta).toEqual({title: 'parent'});
    replayDocumentFragment(md, fragment, parent, {purpose: 'include'});
    expect(parent.meta).toEqual({title: 'parent', style: ['child.css']});
    expect(() =>
        replayDocumentFragment(new MarkdownIt(), fragment, {}, {purpose: 'include'}),
    ).toThrow('created by this configured parser');
    expect(nodeLog.isEmpty()).toBe(true);
    expect(log.isEmpty()).toBe(true);
});

test('browser guard is outside feature IDs, installed once, and retained for preset:none', () => {
    const calls = vi.fn();
    const host = createBrowserHost([], (options) => resolvePluginConfiguration(options, []));
    const install = vi.fn(host.installGuard);
    host.installGuard = install;
    const parser = createParser(
        {
            pluginConfiguration: {
                preset: 'none',
                plugins: [
                    {id: 'caller', plugin: (md) => md.core.ruler.before('block', 'caller', calls)},
                ],
            },
        },
        host,
    );
    expect(install).toHaveBeenCalledTimes(1);
    expect(() => parser.parseDocument('{% included (child.md) %}')).toThrow(
        'Unsupported browser feature',
    );
    expect(calls).toHaveBeenCalledTimes(1);
    const clean = parser.parseDocument('safe');
    expect(parser.compileDocument(clean)).toContain('safe');
    expect(calls).toHaveBeenCalledTimes(2);
    expect(install).toHaveBeenCalledTimes(1);
});

test('browser source positions survive frontmatter and native CRLF normalization', () => {
    const parser = createParser(
        {},
        createBrowserHost([meta], () => undefined),
    );
    try {
        parser.parseDocument(
            '---\r\nlabel: retained\r\n---\r\n\r\n> {% included (child.md) %}',
            (env) => {
                env.path = 'normalized.md';
            },
        );
        throw new Error('Expected guard failure');
    } catch (error) {
        expect(error).toBeInstanceOf(BrowserUnsupportedFeatureError);
        if (error instanceof BrowserUnsupportedFeatureError) {
            expect(error.location).toEqual({path: 'normalized.md', line: 5, column: 3});
        }
    }
    expect(parser.parseDocument('safe').env.meta).toEqual({});
});

test('Node host does not install a browser guard or change its current default attrs', () => {
    const parser = nodeParser({plugins: [], preprocessors: []});
    expect(() => parser.parseDocument('{% included (child.md) %}')).not.toThrow();
    expect(parser.compileDocument(parser.parseDocument('# Heading {#stable}'))).not.toContain(
        'id="stable"',
    );
    const legacy = nodeParser({plugins: [], preprocessors: [], enableMarkdownAttrs: true});
    expect(legacy.compileDocument(legacy.parseDocument('# Heading {#stable}'))).toContain(
        'id="stable"',
    );
});

test('the real browser host retains final sanitizer protection for HTML and caller highlighter output', () => {
    const parser = createParser(
        {
            allowHTML: true,
            highlighter: () => ({html: '<img src="x" onerror="bad()"><script>bad()</script>'}),
        },
        createBrowserHost([], () => undefined),
    );
    const result = parser.compileDocument(
        parser.parseDocument('<p onclick="bad()" style="color:red">safe</p>\n\n```js\nsource\n```'),
    );
    expect(result).toContain('color:red');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<script');
});
