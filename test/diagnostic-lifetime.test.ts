import type {MarkdownItPluginCb} from '../src/transform/typings';

import {vi} from 'vitest';
import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import transform from '../src/transform';
import createParser from '../src/transform/md';
import {createDiagnosticCollector, log} from '../src/transform/log';
import liquidDocument from '../src/transform/liquid';
import includes from '../src/transform/plugins/includes';
import {parseDocumentFragment} from '../src/transform/document';
import browser, {
    createDiagnosticCollector as browserCollector,
    createParser as createBrowserParser,
    definePlugin,
} from '../src/transform/browser/standard';

beforeEach(() => log.clear());

const levels = {info: [], warn: [], error: [], disabled: []};

const observe: MarkdownItPluginCb = (md, options) => {
    options.log.warn('setup');
    md.core.ruler.push('document-diagnostic', (state) => options.log.warn(state.src));
    md.renderer.rules.paragraph_open = () => {
        options.log.info('render');
        return '<p>';
    };
};

test('250 ordinary unique-path roots retain only their own diagnostics and no global history', () => {
    const outputs = Array.from({length: 250}, (_, index) =>
        transform('ordinary', {path: `page-${index}.md`, plugins: []}),
    );
    for (const output of outputs) expect(output.logs.warn).toHaveLength(1);
    expect(outputs[0].logs.warn[0]).toContain('page-0.md');
    expect(outputs[249].logs.warn[0]).toContain('page-249.md');
    expect(outputs[0].logs).not.toBe(outputs[249].logs);
    expect(log.get()).toEqual(levels);
});

test('explicit project collector aggregates while outputs remain detached document snapshots', () => {
    const diagnostics = createDiagnosticCollector();
    const options = {disableLiquid: true, plugins: [observe], diagnostics};
    const first = transform('first', options);
    const saved = structuredClone(first.logs);
    const second = transform('second', options);
    expect(first.logs).toEqual(saved);
    expect(second.logs.warn.join()).not.toContain('first');
    expect(diagnostics.get().warn).toEqual(['WARN setup', 'WARN first', 'WARN second']);
    diagnostics.clear();
    log.clear();
    expect(first.logs).toEqual(saved);
    const other = structuredClone(second.logs);
    first.logs.warn.push('caller mutation');
    expect(second.logs).toEqual(other);
});

test('new collector get is detached; add keeps duplicates and first-occurrence logging order', () => {
    const diagnostics = createDiagnosticCollector();
    diagnostics.warn('one');
    diagnostics.warn('one');
    diagnostics.add({...levels, warn: ['WARN two', 'WARN two']});
    diagnostics.warn('two');
    expect(diagnostics.get().warn).toEqual(['WARN one', 'WARN two', 'WARN two']);
    const snapshot = diagnostics.get();
    snapshot.warn.length = 0;
    diagnostics.warn('three');
    expect(diagnostics.get().warn).toEqual(['WARN one', 'WARN two', 'WARN two', 'WARN three']);
    diagnostics.clear();
    diagnostics.warn('one');
    expect(diagnostics.get().warn).toEqual(['WARN one']);
});

test('the legacy global collector is used only when explicitly requested and keeps mutable methods', () => {
    const live = log.get();
    live.warn.push('external');
    expect(log.get()).toBe(live);
    const first = transform('first', {disableLiquid: true, plugins: [observe], diagnostics: log});
    expect(log.get().warn).toEqual(['external', 'WARN setup', 'WARN first']);
    log.clear();
    expect(live.warn).toEqual([]);
    expect(first.logs.warn).toEqual(['WARN setup', 'WARN first']);
});

test('parser reuse, older-handle compilation and setup diagnostics select their owned document', () => {
    const parser = createParser({disableLiquid: true, plugins: [observe]});
    expect(parser.logs.warn).toEqual(['WARN setup']);
    const first = parser.parseDocument('first');
    const firstSnapshot = first.logs;
    const second = parser.parseDocument('second');
    expect(first.logs).toEqual(firstSnapshot);
    expect(second.logs.warn).toEqual(['WARN second']);
    parser.compileDocument(first);
    expect(first.logs.info).toEqual(['INFO render']);
    expect(second.logs.info).toEqual([]);
    expect(firstSnapshot.info).toEqual([]);
    expect(parser.logs).toEqual(first.logs);
});

test('failed parser documents retain runtime diagnostics and cannot contaminate the next root', () => {
    const diagnostics = createDiagnosticCollector();
    const failing: MarkdownItPluginCb = (md, options) => {
        md.core.ruler.push('failure', (state) => {
            options.log.error(state.src);
            if (state.src === 'bad') throw new Error('failed root');
        });
    };
    const parser = createParser({plugins: [failing], diagnostics});
    expect(() => parser.parseDocument('bad')).toThrow('failed root');
    const failed = parser.logs;
    expect(failed.error).toEqual(['ERR bad']);
    const next = parser.parseDocument('good');
    expect(next.logs.error).toEqual(['ERR good']);
    expect(failed.error).toEqual(['ERR bad']);
    expect(diagnostics.get().error).toEqual(['ERR bad', 'ERR good']);
});

test('reentrant independent roots and reused external logger keep document collectors separate', () => {
    const external = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    let inner: ReturnType<typeof transform> | undefined;
    const outer: MarkdownItPluginCb = (md, options) => {
        md.core.ruler.push('reentry', () => {
            options.log.warn('outer-before');
            inner = transform('inner', {disableLiquid: true, plugins: [observe], log: external});
            options.log.error('outer-after');
        });
    };
    const output = transform('outer', {disableLiquid: true, plugins: [outer], log: external});
    expect(output.logs.warn).toEqual(['WARN outer-before']);
    expect(output.logs.error).toEqual(['ERR outer-after']);
    expect(inner?.logs.warn).toEqual(['WARN setup', 'WARN inner']);
    transform('inner', {disableLiquid: true, plugins: [observe], log: external});
    expect(external.warn.mock.calls.filter(([message]) => message === 'setup')).toHaveLength(2);
    expect(log.isEmpty()).toBe(true);
});

test('root and standalone Liquid diagnostics use explicit sinks for runtime and deprecation messages', () => {
    const diagnostics = createDiagnosticCollector();
    const output = transform('{{ missing }}\n{% if true %}unclosed', {
        path: 'root.md',
        plugins: [],
    });
    expect(output.logs.warn.join()).toContain('Variable');
    expect(output.logs.error.join()).toContain('Condition block must be closed');
    liquidDocument('{{ missing }}', {}, 'standalone.md', {diagnostics});
    expect(diagnostics.get().warn.join()).toContain('TRANSFORM_BUNDLED_LIQUID');
    expect(diagnostics.get().warn.join()).toContain('Variable');
    expect(log.isEmpty()).toBe(true);
});

test('passing a parser logger into an independent reentrant root forwards without adopting the parent sink', () => {
    let inner: ReturnType<typeof transform> | undefined;
    const outer: MarkdownItPluginCb = (md, options) => {
        md.core.ruler.push('reenter-with-logger', () => {
            options.log.warn('parent');
            inner = transform('child', {disableLiquid: true, plugins: [observe], log: options.log});
        });
    };
    const output = transform('root', {disableLiquid: true, plugins: [outer]});
    expect(output.logs.warn).toEqual(['WARN parent']);
    expect(inner?.logs.warn).toEqual(['WARN setup', 'WARN child']);
    expect(log.isEmpty()).toBe(true);
});

test('included sources and child fragments retain the enclosing document sink', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'transform-document-logs-')));
    try {
        writeFileSync(join(root, 'child.md'), '{{ missing }}');
        const source = '{% include [child](child.md) %}';
        const output = transform(source, {
            path: join(root, 'root.md'),
            root,
            plugins: [includes],
            isLiquided: true,
        });
        expect(
            output.logs.warn.filter((message) => message.includes('TRANSFORM_BUNDLED_LIQUID')),
        ).toHaveLength(1);
        expect(output.logs.warn.join()).toContain(join(root, 'child.md'));
        expect(output.logs.warn.join()).toContain('Variable');
        const child: MarkdownItPluginCb = (md, options) => {
            md.core.ruler.push('child-fragment-diagnostics', (state) => {
                options.log.warn(state.src);
                if (state.src === 'parent')
                    parseDocumentFragment(md, 'nested', state.env, {purpose: 'fragment'});
            });
        };
        const fragment = transform('parent', {plugins: [child], disableLiquid: true});
        expect(fragment.logs.warn).toEqual(['WARN parent', 'WARN nested']);
        expect(log.isEmpty()).toBe(true);
    } finally {
        rmSync(root, {recursive: true, force: true});
    }
});

test('frontmatter, evaluation, cycles and sanitizer diagnostics route all runtime levels locally', () => {
    const output = transform(
        '---\ntitle: first\ntitle: second\n---\n{% for x in missing %}body{% endfor %}\n{% if missing.length > 0 %}x{% endif %}\n<style>p {color:red;</style>',
        {allowHTML: true},
    );
    expect(output.logs.warn.join()).toContain('duplicate mapping');
    expect(output.logs.error.join()).toContain('not iterable');
    expect(output.logs.info.length).toBeGreaterThan(0);
    expect(log.isEmpty()).toBe(true);
});

test('browser roots and reusable parsers use the same detached output and explicit aggregation contract', () => {
    const diagnostics = browserCollector();
    const custom = definePlugin({
        id: 'test/logs',
        setup(md, _options: {}, context) {
            context.log.warn('setup');
            md.core.ruler.push('browser-document-log', (state) => context.log.warn(state.src));
            md.renderer.rules.paragraph_open = () => {
                context.log.info('render');
                return '<p>';
            };
        },
    })({});
    const options = {
        diagnostics,
        pluginConfiguration: {preset: 'none' as const, plugins: [custom]},
    };
    const first = browser('first', options);
    const saved = structuredClone(first.logs);
    const second = browser('second', options);
    expect(second.logs.warn).toEqual(['WARN setup', 'WARN second']);
    diagnostics.clear();
    expect(first.logs).toEqual(saved);
    const parser = createBrowserParser(options);
    const a = parser.parseDocument('A');
    const b = parser.parseDocument('B');
    parser.compileDocument(a);
    expect(a.logs.warn).toEqual(['WARN setup', 'WARN A']);
    expect(a.logs.info).toEqual(['INFO render']);
    expect(b.logs.warn).toEqual(['WARN B']);
    expect(b.logs.info).toEqual([]);
    expect(diagnostics.get().warn).toEqual(['WARN setup', 'WARN A', 'WARN B']);
});

test('tokens-only and failing roots retain explicit project diagnostics without changing older outputs', () => {
    const diagnostics = createDiagnosticCollector();
    const previous = transform('previous', {path: 'previous.md', diagnostics, plugins: []});
    const snapshot = structuredClone(previous.logs);
    expect(
        transform('tokens', {path: 'tokens.md', diagnostics, plugins: [], tokens: true}),
    ).toHaveLength(3);
    expect(diagnostics.get().warn).toHaveLength(2);
    expect(() => transform('---\ninvalid: [\n---\ntext', {path: 'bad.md', diagnostics})).toThrow();
    expect(diagnostics.get().error.join()).toContain('Error occurred');
    diagnostics.clear();
    expect(previous.logs).toEqual(snapshot);
    expect(log.isEmpty()).toBe(true);
});

test('scoped warning forwarding preserves an embedding logger method receiver', () => {
    const external = {
        messages: [] as string[],
        info(message: string) {
            this.messages.push(message);
        },
        warn(message: string) {
            this.messages.push(message);
        },
        error(message: string) {
            this.messages.push(message);
        },
    };
    const output = transform('ordinary', {plugins: [], path: 'receiver.md', log: external});
    expect(output.logs.warn).toHaveLength(1);
    expect(external.messages).toHaveLength(1);
    expect(external.messages[0]).toContain('TRANSFORM_BUNDLED_LIQUID');
});
