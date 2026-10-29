import type {ParserHost} from '../src/transform/parser-core';
import type {MarkdownIt, MarkdownItPluginCb} from '../src/transform/typings';
import type {ParsedDocumentFragment} from '../src/transform/document';

import css from 'css';
import {vi} from 'vitest';

import nodeParser from '../src/transform/md';
import nodeLog from '../src/transform/log';
import sanitize, {defaultOptions} from '../src/transform/sanitize';
import {createParser} from '../src/transform/parser-core';
import {createDiagnosticHost} from '../src/transform/log-core';
import {createDeprecationReporter} from '../src/transform/deprecation-core';
import {createSanitizer} from '../src/transform/sanitize-core';
import {resolvePluginConfiguration} from '../src/transform/plugin-registry-core';
import {builtinPluginIds} from '../src/transform/plugin-configuration';
import {
    createDocumentEnv,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from '../src/transform/document';
import {getDocumentEnv, initializeDocumentField} from '../src/transform/document-context';
import {replayChildDocument} from '../src/transform/document-context-core';

function createHost(defaultPlugins: MarkdownItPluginCb[] = []) {
    const diagnostics = createDiagnosticHost({
        info: () => 'INFO',
        warn: () => 'WARN',
        error: () => 'ERR',
    });
    const sanitizers = createSanitizer(css, diagnostics.log);
    const host: ParserHost = {
        defaultPlugins,
        resolvePlugins: (options) => resolvePluginConfiguration(options, defaultPlugins),
        preprocess: (input) => input,
        getLogger: diagnostics.getLogger,
        createReporter: (options) => createDeprecationReporter(options, diagnostics.warnInScope),
        ...sanitizers,
    };
    return {host, diagnostics};
}

beforeEach(() => nodeLog.clear());

test('shared prelude and Node use the same opt-in attrs policy with custom plugins', () => {
    const source = '# Heading {#stable}\n\n1. item';
    for (const enableMarkdownAttrs of [undefined, true, false]) {
        const options = {plugins: [], enableMarkdownAttrs};
        const shared = createParser(options, createHost().host);
        const node = nodeParser(options);
        const sharedDocument = shared.parseDocument(source);
        const nodeDocument = node.parseDocument(source);
        expect(sharedDocument.env).toEqual(nodeDocument.env);
        expect(shared.compileDocument(sharedDocument)).toBe(node.compileDocument(nodeDocument));
    }
});

test('finite registry uses injected callbacks in the established builtin order', () => {
    const order: string[] = [];
    const plugins = builtinPluginIds.map(
        (id): MarkdownItPluginCb =>
            () =>
                order.push(id),
    );
    const {host} = createHost(plugins);
    const parser = createParser({pluginConfiguration: {preset: 'default'}}, host);
    expect(order).toEqual(builtinPluginIds);
    expect(parser.compileDocument(parser.parseDocument('body'))).toContain('body');
});

test('native Node helpers and shared parser use the same context and capsule owner', () => {
    let native!: MarkdownIt;
    let fragment!: ParsedDocumentFragment;
    const parse = vi.fn();
    const {host} = createHost([
        (md) => {
            native = md;
            // Standalone plugin helpers must reuse the already-installed shared context.
            initializeDocumentField(md, 'meta');
            md.core.ruler.push('resources', (state) => {
                parse();
                getDocumentEnv(md).meta = {style: ['shared.css']};
                if (state.src === 'parent') {
                    fragment = parseDocumentFragmentResult(md, 'child', state.env, {
                        purpose: 'include',
                    });
                }
            });
        },
    ]);
    const parser = createParser({}, host);
    const document = parser.parseDocument('parent');
    expect(document.env.meta).toEqual({style: ['shared.css']});
    const publicParent = createDocumentEnv();
    replayDocumentFragment(native, fragment, publicParent, {purpose: 'include'});
    const coreParent = createDocumentEnv();
    replayChildDocument(native, fragment, coreParent, {purpose: 'fragment'});
    expect(coreParent.meta).toEqual(publicParent.meta);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parser.compileDocument(document)).toContain('parent');
    const foreign = nodeParser({
        plugins: [
            (md) => {
                native = md;
            },
        ],
    });
    foreign.parseDocument('foreign');
    expect(() => replayChildDocument(native, fragment, {}, {purpose: 'include'})).toThrow(
        'created by this configured parser',
    );
});

test('host diagnostics stay isolated while scoped warning forwarding and dynamic formatting survive', () => {
    let label = 'FIRST';
    const diagnostics = createDiagnosticHost({
        info: () => label,
        warn: () => label,
        error: () => label,
    });
    const consumer = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    const logger = diagnostics.getLogger(consumer);
    expect(diagnostics.getLogger(logger)).toBe(logger);
    logger.info('message');
    label = 'SECOND';
    logger.info('message');
    const descriptor = {
        code: 'SHARED_HOST',
        feature: 'Legacy input',
        replacement: 'current input',
        removal: {version: '6.0.0'},
    };
    for (let i = 0; i < 2; i++) {
        const reporter = createDeprecationReporter({log: logger}, diagnostics.warnInScope);
        reporter.warn(descriptor, {option: 'legacy'});
        reporter.warn(descriptor, {option: 'legacy'});
    }
    expect(consumer.warn).toHaveBeenCalledTimes(2);
    expect(diagnostics.log.get().info).toEqual(['FIRST message', 'SECOND message']);
    expect(nodeLog.isEmpty()).toBe(true);
});

test.each([
    '<style>p {color: red; position: fixed} @import "bad.css";</style><p style="color:blue">text</p>',
    '<style>p { color: red;</style><p>text</p>',
    '<p onclick="alert(1)" style="background:url(javascript:alert(1))">text<script>bad()</script></p>',
])('real CSS host retains Node sanitizer output: %s', (html) => {
    const {host} = createHost();
    expect(host.sanitize(html, {...defaultOptions})).toBe(sanitize(html, {...defaultOptions}));
});

test('does not add builtin metadata to unrelated host callbacks', () => {
    const seen: symbol[][] = [];
    const plugins = builtinPluginIds.map(
        (): MarkdownItPluginCb => (_md, options) => {
            seen.push(Object.getOwnPropertySymbols(options));
        },
    );
    const {host} = createHost(plugins);
    createParser({}, host);
    expect(seen).toHaveLength(builtinPluginIds.length);
    expect(seen.every((symbols) => symbols.length === 0)).toBe(true);
});
