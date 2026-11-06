import MarkdownIt from 'markdown-it';
import {vi} from 'vitest';

import transform from '../src/transform';
import browser from '../src/transform/browser/standard';
import {createDeprecationReporter} from '../src/transform/deprecation';
import {extractFrontMatter} from '../src/transform/frontmatter';
import liquidDocument from '../src/transform/liquid';
import {createDiagnosticCollector, getLogger} from '../src/transform/log';
import {definePlugin, defineTransformOptions} from '../src/transform/plugin-configuration';
import imsize from '../src/transform/plugins/imsize';
import table from '../src/transform/plugins/table';
import yfmlint from '../src/transform/yfmlint';

const sink = () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn(), deprecation: vi.fn()});
const descriptor = {
    code: 'EXTERNAL_MIGRATION',
    feature: 'Original option',
    replacement: 'the new option',
    removal: {version: '6.0.0'},
};
const usage = {option: 'original'};
const ordinary = '[DEPRECATED THIRD_PARTY] ordinary plugin warning';
const plugin = definePlugin({
    id: 'external-diagnostics',
    setup(md, _config: undefined, context) {
        md.core.ruler.push('example_diagnostics', () => {
            context.deprecations.warn(descriptor, usage);
            context.deprecations.warn(descriptor, usage);
            context.log.deprecation?.('external migration');
            context.log.warn(ordinary);
        });
    },
})(undefined);

const source = '#|\n|| a {.cell-align-center} | b ||\n|#\n\n![img](img.png =20x30)';

test.each(['node', 'browser'] as const)('%s keeps ordinary warnings distinct', (host) => {
    function render(enabled: boolean) {
        const log = sink();
        const diagnostics = createDiagnosticCollector();
        const common = {deprecationWarnings: enabled, log, diagnostics};
        const pluginConfiguration = {plugins: [plugin]};
        const output =
            host === 'node'
                ? transform(
                      source,
                      defineTransformOptions({
                          core: {...common, disableLiquid: true},
                          plugins: pluginConfiguration,
                      }),
                  )
                : browser(source, {...common, pluginConfiguration});
        expect(log.warn.mock.calls).toEqual([[ordinary]]);
        expect(output.logs.warn).toEqual(diagnostics.get().warn);
        expect(output.logs.warn).toContainEqual(expect.stringContaining(ordinary));
        const typed = log.deprecation.mock.calls.map(([text]) => text);
        if (enabled) {
            for (const code of [
                'TABLE_CELL_ALIGN_CLASS',
                'IMAGE_SIZE_LEGACY_SYNTAX',
                'EXTERNAL_MIGRATION',
                'external migration',
            ]) {
                expect(typed.filter((text) => text.includes(code))).toHaveLength(1);
            }
            expect(output.logs.warn).toHaveLength(5);
        } else {
            expect(typed).toEqual([]);
            expect(output.logs.warn).toHaveLength(1);
        }
        return output.result.html;
    }
    expect(render(false)).toBe(render(true));
});

test('disabled reporters skip formatting and preserve feature policy', () => {
    const log = sink();
    const reporter = createDeprecationReporter({
        log,
        deprecationWarnings: false,
        compatibility: {EXTERNAL_MIGRATION: 'legacy'},
    });
    const unformatted = {
        ...descriptor,
        get feature(): string {
            throw new Error('formatted');
        },
    };
    for (let row = 0; row < 1000; row++) {
        reporter.warn(unformatted, {location: {path: 'doc.md', line: row + 1}});
    }
    expect(reporter.compatibility(descriptor.code)).toBe('legacy');
    expect(log.deprecation).not.toHaveBeenCalled();
});

test('standalone helpers and injected reporters respect the opt-out', () => {
    const log = sink();
    const warn = vi.fn();
    const deprecations = {...createDeprecationReporter({log}), warn};
    const options = {deprecations, deprecationWarnings: false, log: getLogger(log)};
    const md = new MarkdownIt().use(table, options).use(imsize, options);
    expect(md.render(source)).toContain('cell-align-center');
    const doc = '---\na: one\na: two\n---\n\n{% for i in items %}{{ i }}{% endfor %}';
    liquidDocument(doc, {items: ['hello']}, 'duplicates.md', options);
    yfmlint({input: 'plain', pluginOptions: {...options, path: 'deprecation-channel.md'}});
    expect(warn).not.toHaveBeenCalled();
    expect(log.deprecation).not.toHaveBeenCalled();
    expect(log.warn.mock.calls.flat().join(' ')).not.toContain('DEPRECATED');
});

test('only successful duplicate-key recovery is a deprecation', () => {
    const log = sink();
    const good = '---\nvalue: first\nvalue: last\n---\nbody';
    expect(extractFrontMatter(good, 'doc.md', log)[0]).toEqual({value: 'last'});
    expect(log.deprecation).toHaveBeenCalledOnce();
    expect(log.warn).not.toHaveBeenCalled();
    expect(extractFrontMatter(good, 'doc.md', log, false)[0]).toEqual({value: 'last'});
    expect(() => extractFrontMatter('---\nvalue: [\n---\nbody', 'broken.md', log, false)).toThrow();
    expect(log.deprecation).toHaveBeenCalledOnce();
});
