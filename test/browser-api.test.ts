import type {BrowserTransformOptions, MarkdownIt} from '../src/transform/browser/standard';

import {buildSync} from 'esbuild';
import {vi} from 'vitest';

import standard, {
    BrowserUnsupportedFeatureError,
    createDocumentEnv,
    createParser,
    definePlugin,
    materializeFootnoteTokens,
    parseDocumentFragmentResult,
    replayDocumentFragment,
} from '../src/transform/browser/standard';
import minimal, {createParser as createMinimalParser} from '../src/transform/browser/minimal';
import {log} from '../src/transform/browser/diagnostics';
import nodeLog from '../src/transform/log';
import {createIncludeRegExp} from '../src/transform/plugins/includes/syntax';

beforeEach(() => {
    log.clear();
    nodeLog.clear();
});

test.each([standard, minimal])(
    'public browser API retains document shape, shared attrs policy and final sanitizer',
    (transform) => {
        const source =
            '# Title {.custom}\n\n<img src="image.png" onerror="bad()"><a href="javascript:bad()">link</a>';
        const result = transform(source, {allowHTML: true});
        expect(result.result).toHaveProperty('headings');
        expect(result.result).toHaveProperty('title', '');
        expect(result.result.html).not.toContain('class="custom"');
        expect(result.result.html).toContain('{.custom}');
        expect(result.result.html).not.toMatch(/onerror|javascript:/);
        expect(result.logs).toBe(log.get());
        expect(
            transform(source, {allowHTML: true, enableMarkdownAttrs: true}).result.html,
        ).toContain('class="custom"');
        expect(nodeLog.isEmpty()).toBe(true);
    },
);

test('standard binds the real additive underline/subscript callbacks while minimal has no feature implementations', () => {
    expect(standard('++under++ H~2~O').result.html).toContain('<u>under</u> H<sub>2</sub>O');
    expect(minimal('++under++ H~2~O').result.html).toContain('++under++ H~2~O');
    const {metafile} = buildSync({
        entryPoints: ['src/transform/browser/minimal.ts'],
        bundle: true,
        platform: 'browser',
        format: 'esm',
        write: false,
        metafile: true,
    });
    const paths = Object.keys(metafile.inputs);
    expect(
        paths.some((path) =>
            /(?:standard-plugins|plugins\/(?:table|notes|footnotes|task-list|imsize|includes\/index)|(?:cut|file|tabs)-extension|markdown-it-footnote|@mdit\/plugin-tasklist)/.test(
                path,
            ),
        ),
    ).toBe(false);
    expect(
        paths.some((path) =>
            /(?:highlight\.js|lowlight|chalk|utilsFS|liquid\/|plugins\/utils\.ts)/.test(path),
        ),
    ).toBe(false);
});

test.each([
    {root: '/docs'},
    {path: 'host.md'},
    {plugins: []},
    {preprocessors: []},
    {disableLiquid: true},
    {isLiquided: true},
    {vars: {}},
    {included: false},
    {needToSanitizeHtml: false},
    {sanitize: () => 'unsafe'},
    {inlineSvg: true},
    {highlightLangs: {}},
    {tokens: true},
    {getPublicPath: () => '/docs'},
    {sanitizeOptions: {disableStyleSanitizer: true}},
    {sanitizeOptions: {parser: {lowerCaseTags: true}}},
    {pluginConfiguration: {unexpected: true}},
    {pluginConfiguration: {options: {tabs: {output: '/tmp'}}}},
    {pluginConfiguration: {options: {file: {output: '/tmp'}}}},
    {pluginConfiguration: {options: {cut: {output: '/tmp'}}}},
])('unsupported JavaScript option fails before parser/user-rule execution: %j', (unsupported) => {
    const setup = vi.fn();
    const plugin = definePlugin({id: 'caller', setup})(undefined);
    const options = {
        pluginConfiguration: {plugins: [plugin]},
        ...unsupported,
    };
    expect(() => Reflect.apply(standard, undefined, ['text', options])).toThrow(
        BrowserUnsupportedFeatureError,
    );
    expect(setup).not.toHaveBeenCalled();
    expect(nodeLog.isEmpty()).toBe(true);
});

test('minimal rejects enabling an unavailable builtin before caller setup', () => {
    const setup = vi.fn();
    const options: BrowserTransformOptions = {
        pluginConfiguration: {
            enable: ['notes'],
            plugins: [definePlugin({id: 'caller', setup})(undefined)],
        },
    };
    expect(() => Reflect.apply(minimal, undefined, ['text', options])).toThrow(
        /Import @diplodoc\/transform\/browser/,
    );
    expect(setup).not.toHaveBeenCalled();
    expect(minimal('text', {pluginConfiguration: {preset: 'default'}}).result.html).toBe(
        '<p>text</p>\n',
    );
});

test('browser preset:none installs the guard and typed caller setup exactly once with the exact ID generator', () => {
    const generateID = vi.fn(() => 'fixed');
    const rules = vi.fn();
    const setup = vi.fn((md: MarkdownIt, _settings: undefined, context) => {
        expect(context.generateID).toBe(generateID);
        md.core.ruler.push('caller', rules);
    });
    const parser = createParser({
        generateID,
        pluginConfiguration: {
            preset: 'none',
            plugins: [definePlugin({id: 'caller', setup})(undefined)],
        },
    });
    expect(setup).toHaveBeenCalledOnce();
    expect(() => parser.parseDocument('{% include [part](part.md) %}')).toThrow(
        BrowserUnsupportedFeatureError,
    );
    expect(rules).not.toHaveBeenCalled();
    expect(parser.compileDocument(parser.parseDocument('text'))).toBe('<p>text</p>\n');
    expect(rules).toHaveBeenCalledOnce();
    expect(generateID).not.toHaveBeenCalled();
});

test('both browser entries share genuine same-native-parser capsules without admitting foreign parser ownership', () => {
    let native: MarkdownIt | undefined;
    const plugin = definePlugin({
        id: 'capture',
        setup(md) {
            native = md;
        },
    })(undefined);
    createMinimalParser({pluginConfiguration: {plugins: [plugin]}}).parseDocument('initialize');
    if (!native) {
        throw new Error('Expected actual native parser');
    }
    const parent = createDocumentEnv();
    const fragment = parseDocumentFragmentResult(native, 'child', parent, {purpose: 'reference'});
    expect(parent.headings).toEqual([]);
    replayDocumentFragment(native, fragment, parent, {purpose: 'fragment'});
    expect(fragment.tokens[1].content).toBe('child');
});

test('include matching is one canonical grammar with fresh mutable RegExp instances', () => {
    const first = createIncludeRegExp();
    const second = createIncludeRegExp();
    expect(first).not.toBe(second);
    expect(first.exec('{% include notitle [Title](part.md#heading) %}')?.slice(1)).toEqual([
        'notitle',
        'Title',
        'part.md#heading',
    ]);
    for (const source of ['{% include [part](part.md) %}', '{%include[part](part.md)%}']) {
        expect(() => standard(source)).toThrow(BrowserUnsupportedFeatureError);
    }
    for (const source of [
        'prefix {% include [part](part.md) %}',
        '\\{% include [part](part.md) %}',
        '`{% include [part](part.md) %}`',
    ]) {
        expect(() => standard(source)).not.toThrow();
    }
});

test.each([
    null,
    [],
    {allowHTML: 'true'},
    {lang: 'missing'},
    {generateID: 1},
    {highlighter: {highlight() {}}},
    {disableRules: 'fence'},
    {log: {warn() {}}},
    {compatibility: {FEATURE: 'wildcard'}},
    {pluginConfiguration: {preset: 'minimal'}},
    {pluginConfiguration: {enable: 'notes'}},
    {pluginConfiguration: {plugins: [{}]}},
    {pluginConfiguration: {options: {notes: {notesAutotitle: 'yes'}}}},
    {pluginConfiguration: {options: {video: {youtube: {width: '100%'}}}}},
    {sanitizeOptions: {allowedTags: true}},
    {sanitizeOptions: {cssWhiteList: {color: 'yes'}}},
    {sanitizeOptions: {allowedAttributes: {'*': [{name: 'data-x', values: 1}]}}},
])('invalid JavaScript value is rejected before parsing: %j', (options) => {
    expect(() => Reflect.apply(standard, undefined, ['text', options])).toThrow(TypeError);
});

test.each([
    {pluginConfiguration: {disable: ['notes']}},
    {pluginConfiguration: {options: {notes: {}}}},
])('minimal rejects every unavailable builtin reference: %j', (options) => {
    expect(() => Reflect.apply(minimal, undefined, ['text', options])).toThrow(
        BrowserUnsupportedFeatureError,
    );
});

test('browser sanitizer normalization cannot inherit a Node bypass option', () => {
    const sanitizeOptions = Object.create({disableStyleSanitizer: true});
    sanitizeOptions.allowedTags = ['p'];
    sanitizeOptions.allowedAttributes = {'*': ['style']};
    const result = standard('<p style="position:fixed;color:red">text</p>', {
        allowHTML: true,
        sanitizeOptions,
    });
    expect(result.result.html).not.toContain('position:fixed');
});

test('browser admits selected cached footnotes through the canonical document API', () => {
    let native: MarkdownIt | undefined;
    const generateID = vi.fn(() => 'browser');
    const host = definePlugin({
        id: 'capture-parser',
        setup(md) {
            native = md;
        },
    })({});
    const parser = createParser({
        generateID,
        extractTitle: true,
        pluginConfiguration: {plugins: [host]},
    });
    const root = parser.parseDocument('# Title[^a]\n\n[^a]: - [x] root');
    if (!native) throw new Error('Missing native parser');
    const child = parseDocumentFragmentResult(native, 'child[^a]\n\n[^a]: child note', root.env, {
        purpose: 'reference',
    });
    const first = materializeFootnoteTokens(child.tokens, child.tokens.slice(0, 3));
    const second = materializeFootnoteTokens(child.tokens, child.tokens.slice(0, 3));
    replayDocumentFragment(native, child, root.env, {purpose: 'include'});
    root.tokens.push(...first, ...second);
    const html = root.env.title + parser.compileDocument(root);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    for (const match of html.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain(match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).toContain('disabled');
    expect(generateID).toHaveBeenCalledTimes(1);
});
