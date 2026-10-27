import type {MarkdownIt, MarkdownItPluginCb, ParserEnv} from '../src/transform/typings';

import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import NativeMarkdownIt from 'markdown-it';
import {transform as cutTransform} from '@diplodoc/cut-extension';
import {vi} from 'vitest';

import transform from '../src/transform';
import parser from '../src/transform/md';
import log from '../src/transform/log';
import {
    IncludeCycleError,
    createDocumentEnv,
    envMeta,
    parseDocumentFragment,
} from '../src/transform/document';
import {createDeprecationReporter} from '../src/transform/deprecation';
import meta from '../src/transform/plugins/meta';
import includes from '../src/transform/plugins/includes';
import links from '../src/transform/plugins/links';
import images from '../src/transform/plugins/images';
import DefaultPlugins from '../src/transform/plugins';
import checkbox from '../src/transform/plugins/checkbox';

const logger = () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn()});

function fixture(files: Record<string, string>) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'transform-context-')));
    for (const [name, source] of Object.entries(files)) {
        writeFileSync(join(root, name), source);
    }
    return {root, path: join(root, 'root.md')};
}

describe('document lifecycle', () => {
    test('preserves ordinary result key presence with and without builtins', () => {
        expect(transform('plain', {plugins: [], disableLiquid: true}).result).toEqual({
            meta: undefined,
            assets: undefined,
            title: '',
            headings: [],
            html: '<p>plain</p>\n',
            additionalOptionsCssWhiteList: {'--hier-list-start': true},
        });
        expect(transform('plain', {disableLiquid: true}).result).toEqual({
            meta: {},
            assets: undefined,
            title: '',
            headings: [],
            html: '<p>plain</p>\n',
            additionalOptionsCssWhiteList: {'--hier-list-start': true},
        });
    });

    test('fresh actual envs and hidden extension Sets survive A→B and A→A correctly', () => {
        const md = parser({disableLiquid: true});
        const source = '---\nname: A\n---\n\n{% cut "More" %}\n\nbody\n\n{% endcut %}';
        const a = md.parseDocument(source);
        const saved = {...a.env.meta};
        const b = md.parseDocument('plain');
        const again = md.parseDocument(source);
        expect(a.env).not.toBe(b.env);
        expect(a.env).not.toBe(again.env);
        expect(a.env.meta).toEqual(saved);
        expect(b.env.meta).toEqual({});
        expect(again.env.meta).toEqual(a.env.meta);
        expect(a.env.bundled).toBeInstanceOf(Set);
        expect(a.env.bundled).not.toBe(again.env.bundled);
        expect(Object.getOwnPropertyDescriptor(a.env, 'bundled')?.configurable).toBe(false);
        expect(Object.keys(a.env)).not.toContain('included');
        expect(Object.keys(a.env)).not.toContain('bundled');
    });

    test('parse A, parse B, compile A uses the exact original env including inline renders', () => {
        const observed: ParserEnv[] = [];
        const plugin: MarkdownItPluginCb = (md) => {
            md.renderer.rules.text = (tokens, i, _options, env) => {
                expect(env).toBeDefined();
                const context = env as ParserEnv;
                observed.push(context);
                return `${context.meta?.name}:${tokens[i].content}`;
            };
        };
        const md = parser({plugins: [meta, plugin], needToSanitizeHtml: false});
        const a = md.parseDocument('---\nname: A\n---\nhello');
        const b = md.parseDocument('---\nname: B\n---\nworld');
        expect(md.compile(a.tokens)).toContain('A:hello');
        expect(observed.at(-1)).toBe(a.env);
        expect(md.compileDocument(b)).toContain('B:world');
        expect(observed.at(-1)).toBe(b.env);
        expect(md.compile(a.tokens.slice(), a)).toContain('A:hello');
        expect(() => md.compileDocument(parser({}).parseDocument('foreign'))).toThrow(
            'this parser',
        );
        expect(() => md.compileDocument({...a})).toThrow('this parser');
    });

    test('legacy destructured view forwards custom data, pending writes and last root only', () => {
        const md = parser({plugins: []});
        const {env} = md;
        Object.assign(env, {custom: 'pending'});
        const a = md.parseDocument('A');
        expect(a.env.custom).toBe('pending');
        Object.assign(env, {custom: 'edited A'});
        const b = md.parseDocument('B', (next) => Object.assign(next, {custom: 'B'}));
        expect(a.env.custom).toBe('edited A');
        expect({...env}).toMatchObject({custom: 'B'});
        expect('custom' in env).toBe(true);
        md.compileDocument(a);
        expect({...env}).toMatchObject({custom: 'edited A'});
        expect(b.env.custom).toBe('B');
        expect(() => Object.freeze(env)).toThrow('document.env');
        Object.defineProperty(a.env, 'hidden', {value: 1});
        expect(Object.getOwnPropertyDescriptor(env, 'hidden')).toMatchObject({
            value: 1,
            configurable: true,
        });
    });

    test('legacy md fields follow child frames while the legacy env view stays on the root', () => {
        let native!: MarkdownIt;
        const consumer = logger();
        const plugin: MarkdownItPluginCb = (md) => {
            native = md;
        };
        const md = parser({plugins: [meta, plugin], log: consumer});
        const a = md.parseDocument('---\nname: parent\n---\nroot');
        const child = createDocumentEnv();
        native.parse('---\nname: child\n---\nchild', child);
        expect(child.meta?.name).toBe('child');
        expect(md.env.meta).toEqual({name: 'parent'});
        md.compileDocument(a);
        expect(native.meta).toBe(a.env.meta);
        expect(consumer.warn.mock.calls.some(([message]) => message.includes('MD_META'))).toBe(
            true,
        );
    });

    test('parse and renderer failures restore context and do not contaminate the next root', () => {
        const plugin: MarkdownItPluginCb = (md) => {
            md.core.ruler.push('failure', (state) => {
                if (state.src === 'parse error') {
                    state.env.meta = {dirty: true};
                    throw new Error('parse failure');
                }
            });
            md.renderer.rules.text = (tokens, i) => {
                if (tokens[i].content === 'render error') {
                    throw new Error('render failure');
                }
                return tokens[i].content;
            };
        };
        const md = parser({plugins: [meta, plugin]});
        const a = md.parseDocument('A');
        expect(() => md.parseDocument('parse error')).toThrow('parse failure');
        expect(md.env.meta).toBe(a.env.meta);
        const failed = md.parseDocument('render error');
        expect(() => md.compileDocument(failed)).toThrow('render failure');
        expect(() => md.compileDocument(failed)).toThrow('valid document');
        const b = md.parseDocument('B');
        expect(b.env.meta).toEqual({});
        expect(md.compileDocument(b)).toBe('<p>B</p>\n');
    });

    test('first failed attempt consumes seeds and leaves a clean implicit legacy view', () => {
        let native!: MarkdownIt;
        const capture: MarkdownItPluginCb = (md) => {
            native = md;
        };
        const md = parser({plugins: [meta, capture]});
        Object.assign(md.env, {seed: 'first attempt only'});
        expect(() =>
            md.parseDocument('A', (env) => {
                expect(env.seed).toBe('first attempt only');
                env.meta = {dirty: true};
                throw new Error('initializer failed');
            }),
        ).toThrow('initializer failed');
        expect(md.env.meta).toEqual({});
        expect({...md.env}).not.toHaveProperty('seed');
        expect(native.meta).toEqual({});
        const b = md.parseDocument('B');
        expect(b.env.meta).toEqual({});
        expect(b.env.seed).toBeUndefined();
    });

    test('rejects top-level reentrance but permits explicit child parsing', () => {
        let reenter = true;
        const plugin: MarkdownItPluginCb = (native) => {
            native.core.ruler.push('nested', (state) => {
                if (state.src === 'root') {
                    if (reenter) {
                        // Invoked after the parser has been constructed.
                        // eslint-disable-next-line @typescript-eslint/no-use-before-define
                        md.parseDocument('other root');
                    } else {
                        parseDocumentFragment(native, 'child', state.env, {purpose: 'fragment'});
                    }
                }
            });
        };
        const md = parser({plugins: [plugin]});
        expect(() => md.parseDocument('root')).toThrow('reentered');
        reenter = false;
        expect(md.compileDocument(md.parseDocument('root'))).toBe('<p>root</p>\n');
    });

    test('injected reporter is consumed by the first attempted parse, then scopes are fresh', () => {
        const consumer = logger();
        const scope = createDeprecationReporter({log: consumer});
        const descriptor = {
            code: 'CONTEXT_TEST',
            feature: 'test',
            replacement: 'new',
            removal: {version: '6.0.0'},
        };
        scope.warn(descriptor, {option: 'test'});
        const plugin: MarkdownItPluginCb = (md, options) => {
            md.core.ruler.push('warning', (state) => {
                options.deprecations?.warn(descriptor, {option: 'test'});
                if (state.src === 'fail') {
                    throw new Error('first attempt');
                }
            });
        };
        const md = parser({plugins: [plugin], log: consumer}, scope);
        expect(() => md.parseDocument('fail')).toThrow('first attempt');
        md.parseDocument('second');
        md.parseDocument('second');
        expect(consumer.warn).toHaveBeenCalledTimes(3);
    });

    test('unassociated arrays retain the warned last-root compatibility fallback', () => {
        const consumer = logger();
        const md = parser({plugins: [], log: consumer});
        const a = md.parseDocument('A');
        expect(md.compile(a.tokens.slice())).toBe('<p>A</p>\n');
        expect(consumer.warn.mock.calls[0][0]).toContain('UNASSOCIATED_DOCUMENT_TOKENS');
        expect(consumer.warn.mock.calls[0][0]).toContain('6.0.0');
    });

    test('checkbox state is fresh per document while custom generator identity remains exact', () => {
        const generateID = vi.fn(() => 'application-id');
        const plugin: MarkdownItPluginCb = (_md, options) =>
            expect(options.generateID).toBe(generateID);
        const md = parser({plugins: [checkbox, plugin], generateID});
        const a = md.compileDocument(md.parseDocument('[ ] A'));
        const b = md.compileDocument(md.parseDocument('[ ] B'));
        expect(a).toContain('id="checkbox0"');
        expect(b).toContain('id="checkbox0"');
    });

    test('raw MarkdownIt meta writer uses the exact supplied env and remains compatible', () => {
        const native = new NativeMarkdownIt().use(envMeta);
        const a = createDocumentEnv();
        native.render('---\nname: A\n---\nbody', a);
        const b = createDocumentEnv();
        native.render('body', b);
        expect(a.meta).toEqual({name: 'A'});
        expect(b.meta).toEqual({});
    });

    test.each(['render', 'renderInline'] as const)(
        'raw native %s restores the previous successful fields after renderer failure',
        (method) => {
            const native = new NativeMarkdownIt().use(meta, {
                path: '',
                root: '',
                rootPublicPath: '',
                lang: 'en',
                log,
                isLintRun: false,
            }) as MarkdownIt;
            const environments: ParserEnv[] = [];
            native.core.ruler.push('document-resources', (state) => {
                const env = state.env as ParserEnv;
                if (state.inlineMode) {
                    env.meta = {name: state.src};
                }
                env.assets = [String(env.meta?.name)];
                environments.push(env);
            });
            native.renderer.rules.text = (tokens, index, _options, env) => {
                expect(env).toBeDefined();
                expect(native.meta).toBe(env?.meta);
                expect(native.assets).toBe(env?.assets);
                if (tokens[index].content === 'B') {
                    throw new Error('native render failure');
                }
                return tokens[index].content;
            };
            const input = (name: string) =>
                method === 'render' ? `---\nname: ${name}\n---\n${name}` : name;

            expect(native[method](input('A'))).toContain('A');
            const previousMeta = native.meta;
            const previousAssets = native.assets;
            expect(previousMeta).toEqual({name: 'A'});
            expect(() => native[method](input('B'))).toThrow('native render failure');
            expect(environments[1].meta).toEqual({name: 'B'});
            expect(native.meta).toBe(previousMeta);
            expect(native.assets).toBe(previousAssets);
            expect(native[method](input('C'))).toContain('C');
            expect(native.meta).toBe(environments[2].meta);
            expect(native.assets).toBe(environments[2].assets);
            expect(native.meta).toEqual({name: 'C'});
            expect(new Set(environments).size).toBe(3);
        },
    );
});

describe('nested document contexts', () => {
    test('nested/repeated includes preserve parent frontmatter and deduplicate real runtime resources', () => {
        const files = fixture({
            'root.md': '',
            'child.md':
                '---\nname: child\n---\n{% include [grand](grand.md) %}\n\n{% cut "More" %}\n\nbody\n\n{% endcut %}',
            'grand.md': '---\nname: grand\n---\nGrand',
        });
        try {
            const md = parser({
                ...files,
                disableLiquid: true,
                plugins: [meta, cutTransform({bundle: false, runtime: 'cut'}), includes],
            });
            const input =
                '---\nname: parent\n---\n{% include [child](child.md) %}\n\n{% include [child](child.md) %}';
            const a = md.parseDocument(input);
            expect(a.env.meta?.name).toBe('parent');
            expect(a.env.meta?.script).toEqual(['cut']);
            expect(a.env.meta?.script).toEqual([...new Set(a.env.meta?.script)]);
            expect(a.env.meta?.style).toEqual([...new Set(a.env.meta?.style)]);
            expect(a.env.includes).toEqual([]);
            expect(md.compileDocument(a)).toContain('Grand');
            expect(md.parseDocument(input).env.meta).toEqual(a.env.meta);
            expect(md.parseDocument('plain').env.meta).toEqual({});
        } finally {
            rmSync(files.root, {recursive: true, force: true});
        }
    });

    test('cycles throw a visible recoverable error and a subsequent document succeeds', () => {
        const files = fixture({'root.md': '', 'cycle.md': '{% include [self](cycle.md) %}'});
        try {
            const consumer = logger();
            const md = parser({...files, log: consumer, plugins: [...DefaultPlugins, includes]});
            expect(() => md.parseDocument('{% include [cycle](cycle.md) %}')).toThrow(
                IncludeCycleError,
            );
            expect(
                consumer.error.mock.calls.some(([message]) =>
                    message.includes('Circular includes'),
                ),
            ).toBe(true);
            expect(md.compileDocument(md.parseDocument('B'))).toBe('<p>B</p>\n');
        } finally {
            rmSync(files.root, {recursive: true, force: true});
        }
    });

    test('materialized sources and image assets reset between roots; fragments retain parent metadata', () => {
        const files = fixture({'root.md': '', 'image.png': 'image'});
        try {
            const md = parser({...files, plugins: [meta, images, includes], disableLiquid: true});
            const source = `---\nname: parent\n---\n{% include [child](child.md#part) %}\n\n{% included(child.md) %}\n---\nname: child\n---\n# Part {#part}\n\n![image](image.png)\n\n# Other\nOther text\n{% endincluded %}`;
            const a = md.parseDocument(source);
            expect(a.env.meta?.name).toBe('parent');
            expect(a.env.assets?.length).toBe(1);
            const html = md.compileDocument(a);
            expect(html).toContain('id="part"');
            expect(html).not.toContain('Other text');
            const b = md.parseDocument('plain');
            expect(b.env.assets).toEqual([]);
            expect(b.env.included).toEqual({});
            expect(a.env.included?.[join(files.root, 'child.md')]).toContain('# Part');
            expect(md.parseDocument(source).env.assets).toEqual(a.env.assets);
        } finally {
            rmSync(files.root, {recursive: true, force: true});
        }
    });

    test('nested materialized sources are preprocessed inside the child context', () => {
        const files = fixture({
            'root.md': '',
            'child.md':
                '{% include [grand](grand.md) %}\n\n{% included(grand.md) %}\n---\nname: grand\n---\nMaterialized grandchild\n{% endincluded %}',
        });
        try {
            const md = parser({...files, plugins: [meta, includes], disableLiquid: true});
            const a = md.parseDocument('---\nname: parent\n---\n{% include [child](child.md) %}');
            expect(md.compileDocument(a)).toContain('Materialized grandchild');
            expect(a.env.meta).toEqual({name: 'parent'});
            expect(a.env.included?.[join(files.root, 'grand.md')]).toContain(
                'Materialized grandchild',
            );
        } finally {
            rmSync(files.root, {recursive: true, force: true});
        }
    });

    test('successful nested mappings serve repeated siblings and subsequent explicit references', () => {
        const files = fixture({
            'root.md': '',
            'child.md':
                '{% include [grand](grand.md) %}\n\n{% included(grand.md) %}\n# Materialized grandchild\n{% endincluded %}',
            'sibling.md': '{% include [grand](grand.md) %}',
        });
        let native!: MarkdownIt;
        const capture: MarkdownItPluginCb = (md) => {
            native = md;
        };
        try {
            const md = parser({
                ...files,
                plugins: [meta, includes, links, capture],
                skipLinkFileCheck: true,
                disableLiquid: true,
            });
            const a = md.parseDocument(
                '{% include [child](child.md) %}\n\n{% include [sibling](sibling.md) %}',
            );
            expect(md.compileDocument(a).match(/Materialized grandchild/g)).toHaveLength(2);
            const reference = parseDocumentFragment(native, '[](grand.md)', a.env, {
                purpose: 'reference',
            });
            expect(md.compile(reference, a)).toMatch(/<a[^>]*>Materialized grandchild<\/a>/);
            expect(a.env.included?.[join(files.root, 'grand.md')]).toContain(
                '# Materialized grandchild',
            );
            expect(md.parseDocument('B').env.included).toEqual({});
        } finally {
            rmSync(files.root, {recursive: true, force: true});
        }
    });

    test('root-encoded child mappings remain available to same-pass title links', () => {
        const files = fixture({'root.md': ''});
        try {
            const md = parser({
                ...files,
                plugins: [meta, includes, links],
                skipLinkFileCheck: true,
                disableLiquid: true,
            });
            const source =
                '{% included(child.md) %}\n{% include [grand](grand.md) %}\n{% endincluded %}\n\n{% included(child.md:grand.md) %}\n# Encoded grandchild\n{% endincluded %}\n\n{% include [child](child.md) %}\n\n[](grand.md)';
            expect(md.compileDocument(md.parseDocument(source))).toMatch(
                /<a[^>]*>Encoded grandchild<\/a>/,
            );
        } finally {
            rmSync(files.root, {recursive: true, force: true});
        }
    });

    test('included mappings preserve explicit parent and first successful include values', () => {
        let native!: MarkdownIt;
        const plugin: MarkdownItPluginCb = (md) => {
            native = md;
            md.core.ruler.push('materialize', (state) => {
                state.env.included = {'/grand.md': state.src};
                if (state.src === 'fail') throw new Error('mapping failure');
            });
        };
        parser({plugins: [plugin]});
        const parent = createDocumentEnv();
        parseDocumentFragment(native, 'reference', parent, {purpose: 'reference'});
        expect(parent.included).toEqual({});
        expect(() => parseDocumentFragment(native, 'fail', parent, {purpose: 'include'})).toThrow(
            'mapping failure',
        );
        expect(parent.included).toEqual({});
        parent.included = {'/grand.md': 'explicit root'};
        parseDocumentFragment(native, 'child', parent, {purpose: 'include'});
        expect(parent.included).toEqual({'/grand.md': 'explicit root'});
        parent.included = {};
        parseDocumentFragment(native, 'first', parent, {purpose: 'include'});
        parseDocumentFragment(native, 'second', parent, {purpose: 'include'});
        expect(parent.included).toEqual({'/grand.md': 'first'});
    });

    test('real tabs, file and video resource writers merge through repeated includes', () => {
        const files = fixture({
            'root.md': '',
            'child.md':
                '{% list tabs %}\n\n- First\n\n  Content\n\n- Second\n\n  More\n\n{% endlist %}\n\n{% file src="asset.txt" name="asset.txt" %}\n\n@[rutube](https://rutube.ru/video/test/)',
        });
        try {
            const md = parser({
                ...files,
                plugins: [...DefaultPlugins, includes],
                disableLiquid: true,
            });
            const input = '{% include [child](child.md) %}\n\n{% include [child](child.md) %}';
            const a = md.parseDocument(input);
            expect(a.env.meta?.script?.some((url) => url.includes('tabs'))).toBe(true);
            expect(a.env.meta?.style?.some((url) => url.includes('file'))).toBe(true);
            expect(a.env.meta?.csp?.length).toBeGreaterThan(0);
            expect(md.parseDocument(input).env.meta).toEqual(a.env.meta);
            expect(md.compileDocument(a)).toContain('role="tabpanel"');
            expect(md.parseDocument('plain').env.meta).toEqual({});
        } finally {
            rmSync(files.root, {recursive: true, force: true});
        }
    });

    test('unknown resource-shaped frontmatter is preserved and collisions commit nothing', () => {
        let native!: MarkdownIt;
        const capture: MarkdownItPluginCb = (md) => {
            native = md;
        };
        const md = parser({plugins: [meta, capture]});
        const document = md.parseDocument(
            '---\nscript: custom value\ncsp: custom policy\n---\nroot',
        );
        expect(document.env.meta).toEqual({script: 'custom value', csp: 'custom policy'});
        const parent = createDocumentEnv();
        parent.meta = {name: 'parent'};
        parseDocumentFragment(native, '---\nscript: child custom value\n---\nchild', parent, {
            purpose: 'include',
        });
        expect(parent.meta).toEqual({name: 'parent'});
        Object.assign(parent.meta, {script: [], style: 'parent custom value'});
        const child = '---\nscript: [runtime.js]\nstyle: [runtime.css]\n---\nchild';
        expect(() => parseDocumentFragment(native, child, parent, {purpose: 'include'})).toThrow(
            'meta.style',
        );
        expect(parent.meta).toEqual({name: 'parent', script: [], style: 'parent custom value'});
        expect(parent.assets).toBeUndefined();
        expect(() =>
            parseDocumentFragment(native, child, parent, {purpose: 'reference'}),
        ).not.toThrow();
    });

    test('visibility audiences use the writer order across successful children only', () => {
        let native!: MarkdownIt;
        const capture: MarkdownItPluginCb = (md) => {
            native = md;
            md.core.ruler.push('fail-after-visibility', (state) => {
                if (state.src.includes('FAIL')) {
                    throw new Error('visibility child failed');
                }
            });
        };
        parser({plugins: [...DefaultPlugins, capture]});
        const parent = createDocumentEnv();
        parent.meta = {visibilityAudiences: ['agent'], custom: {keep: true}};
        const human = ':::visibility human\n\nHuman\n\n:::';
        const agent = ':::visibility agent\n\nAgent\n\n:::';
        parseDocumentFragment(native, human, parent, {purpose: 'reference'});
        expect(parent.meta.visibilityAudiences).toEqual(['agent']);
        expect(() =>
            parseDocumentFragment(native, human + '\nFAIL', parent, {purpose: 'include'}),
        ).toThrow('visibility child failed');
        expect(parent.meta.visibilityAudiences).toEqual(['agent']);
        parseDocumentFragment(native, human, parent, {purpose: 'include'});
        parseDocumentFragment(native, agent, parent, {purpose: 'include'});
        parseDocumentFragment(native, human, parent, {purpose: 'include'});
        expect(parent.meta).toEqual({
            visibilityAudiences: ['human', 'agent'],
            custom: {keep: true},
        });
    });

    test('reference lookups do not merge another page resources; failures commit no child metadata', () => {
        let native!: MarkdownIt;
        const plugin: MarkdownItPluginCb = (md) => {
            native = md;
            md.core.ruler.push('resources', (state) => {
                state.env.meta = {
                    name: state.src,
                    script: ['runtime.js'],
                    csp: [{'script-src': ['a', 'a']}],
                };
                state.env.assets = ['asset.png'];
                if (state.src === 'failure') {
                    throw new Error('child failed');
                }
            });
        };
        parser({plugins: [plugin]});
        const parent = createDocumentEnv();
        parent.meta = {name: 'parent'};
        parseDocumentFragment(native, 'reference', parent, {purpose: 'reference'});
        expect(parent.meta).toEqual({name: 'parent'});
        expect(parent.assets).toBeUndefined();
        expect(() =>
            parseDocumentFragment(native, 'failure', parent, {purpose: 'include'}),
        ).toThrow('child failed');
        expect(parent.meta).toEqual({name: 'parent'});
        parseDocumentFragment(native, 'include', parent, {purpose: 'include'});
        parseDocumentFragment(native, 'include', parent, {purpose: 'include'});
        expect(parent.meta).toEqual({
            name: 'parent',
            script: ['runtime.js'],
            csp: [{'script-src': ['a']}],
        });
        expect(parent.assets).toEqual(['asset.png']);
    });
});
