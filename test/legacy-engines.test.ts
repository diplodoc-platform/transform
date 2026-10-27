import type {StateCore} from '../src/transform/typings';

import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import MarkdownIt from 'markdown-it';
import {expectTypeOf, vi} from 'vitest';

import transform from '../src/transform';
import initMarkdownIt from '../src/transform/md';
import liquidDocument, {liquidSnippet} from '../src/transform/liquid';
import yfmlint from '../src/transform/yfmlint';
import {createDeprecationReporter} from '../src/transform/deprecation';
import {getLogger, log} from '../src/transform/log';
import includes from '../src/transform/plugins/includes';
import {getFileTokens} from '../src/transform/utilsFS';

const consumer = () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn()});
const messages = (logger: ReturnType<typeof consumer>, engine = 'LIQUID') =>
    logger.warn.mock.calls
        .map(([message]) => String(message))
        .filter((message) => message.includes(`[DEPRECATED TRANSFORM_BUNDLED_${engine}]`));

beforeEach(() => log.clear());

describe('retained bundled engines', () => {
    test.each([
        [{}, 1],
        [{disableLiquid: false, isLiquided: false}, 1],
        [{disableLiquid: true}, 0],
        [{isLiquided: true}, 0],
        [{disableLiquid: true, isLiquided: true}, 0],
        [{conditionsInCode: false}, 1],
        [{conditionsInCode: true}, 1],
    ] as const)(
        'root flags %j retain processing and identify actual invocation',
        (flags, count) => {
            const logger = consumer();
            const output = transform('Hello {{ name }}', {
                ...flags,
                vars: {name: 'World'},
                log: logger,
            });
            expect(messages(logger)).toHaveLength(count);
            expect(output.result.html).toBe(
                count ? '<p>Hello World</p>\n' : '<p>Hello {{ name }}</p>\n',
            );
        },
    );

    test('plain input and tokens still invoke Liquid; scopes repeat after success and failure', () => {
        const logger = consumer();
        const options = {log: logger, path: 'guide.md', plugins: []};
        transform('plain', options);
        expect(transform('plain', {...options, tokens: true})).toHaveLength(3);
        expect(() => transform('---\ninvalid: [\n---\nplain', options)).toThrow();
        transform('plain', options);
        expect(messages(logger)).toHaveLength(4);
    });

    test.each(['current', 'legacy'] as const)(
        'policy %s retains processing and warnings',
        (mode) => {
            const logger = consumer();
            const result = transform('{{ name }}', {
                vars: {name: 'World'},
                log: logger,
                compatibility: {TRANSFORM_BUNDLED_LIQUID: mode},
            });
            expect(result.result.html).toBe('<p>World</p>\n');
            expect(messages(logger)).toHaveLength(1);
        },
    );

    test('low-level parser and lint marker alone never invoke bundled engines', () => {
        const logger = consumer();
        const parser = initMarkdownIt({log: logger, plugins: [], isLintRun: true});
        expect(parser.compile(parser.parse('plain'))).toBe('<p>plain</p>\n');
        expect(logger.warn).not.toHaveBeenCalled();
    });

    test('root, parser and same-source helper share one reporter', () => {
        const logger = consumer();
        const deprecations = createDeprecationReporter({log: logger});
        liquidDocument('plain', {}, 'guide.md', {deprecations});
        const parser = initMarkdownIt(
            {
                log: logger,
                path: 'guide.md',
                plugins: [
                    (md, options) => {
                        md.core.ruler.push('same-source-liquid', () => {
                            liquidDocument('plain', {}, options.path, options);
                        });
                    },
                ],
            },
            deprecations,
        );
        parser.parse('plain');
        expect(messages(logger)).toHaveLength(1);
    });

    test('direct document/snippet preserve generic returns and do not duplicate frontmatter work', () => {
        const logger = consumer();
        const settings = Object.freeze({log: logger, withSourceMap: true as const});
        const result = liquidDocument(
            '---\ntitle: "{{ name }}"\n---\n{{ name }}',
            {name: 'World'},
            'direct.md',
            settings,
        );
        expectTypeOf(result).toMatchTypeOf<{output: string; sourceMap: Record<string, string>}>();
        expect(result.output).toContain('World');
        expect(messages(logger)).toHaveLength(1);
        expectTypeOf(liquidSnippet('plain', {})).toEqualTypeOf<string>();
        expect(
            liquidSnippet(
                '{{ name }}',
                {name: 'World'},
                'direct.md',
                Object.freeze({
                    log: logger,
                    conditions: 'strict' as const,
                    substitutions: false,
                    cycles: false,
                }),
            ),
        ).toBe('{{ name }}');
        expect(messages(logger)).toHaveLength(2);
        expect(Object.keys(settings)).toEqual(['log', 'withSourceMap']);
    });

    test('explicit scope dedup/reset forwards through a normalized logger without clearing old logs', () => {
        const logger = consumer();
        const normalized = getLogger(logger);
        const deprecations = createDeprecationReporter({log: normalized});
        const settings = {deprecations};
        liquidDocument('plain', {}, undefined, settings);
        liquidSnippet('plain', {}, undefined, settings);
        expect(messages(logger)).toHaveLength(1);
        normalized.warn('ordinary');
        deprecations.reset();
        liquidDocument('plain', {}, undefined, settings);
        normalized.warn('ordinary');
        expect(messages(logger)).toHaveLength(2);
        expect(logger.warn.mock.calls.filter(([message]) => message === 'ordinary')).toHaveLength(
            1,
        );
        expect(log.get().warn.join()).toContain('ordinary');
    });

    test('includes retain root bypass distinctions, source paths and repeated-file dedup', () => {
        const root = realpathSync(mkdtempSync(join(tmpdir(), 'transform-legacy-')));
        try {
            writeFileSync(join(root, 'child.md'), '{{ name }}\n');
            const input = '{% include [child](child.md) %}\n\n{% include [child](child.md) %}';
            for (const disableLiquid of [false, true]) {
                const logger = consumer();
                const result = transform(input, {
                    root,
                    path: join(root, 'index.md'),
                    plugins: [includes],
                    isLiquided: true,
                    disableLiquid,
                    vars: {name: 'World'},
                    log: logger,
                });
                expect(result.result.html).toBe(
                    disableLiquid
                        ? '<p>{{ name }}</p>\n<p>{{ name }}</p>\n'
                        : '<p>World</p>\n<p>World</p>\n',
                );
                expect(messages(logger)).toHaveLength(disableLiquid ? 0 : 1);
                if (!disableLiquid) expect(messages(logger)[0]).toContain(join(root, 'child.md'));
            }
        } finally {
            rmSync(root, {recursive: true, force: true});
        }
    });

    test('direct helper preserves callback gating and never mistakes external lint for bundled lint', () => {
        const logger = consumer();
        const md = new MarkdownIt();
        const state = {md, env: {}} as StateCore;
        const lintMarkdown = vi.fn();
        for (const disableLint of [false, true]) {
            const tokens = getFileTokens(
                'child.md',
                state,
                {log: logger, disableLiquid: true, disableLint, lintMarkdown},
                'plain',
            );
            expect(tokens[1].content).toBe('plain');
        }
        expect(lintMarkdown).toHaveBeenCalledOnce();
        expect(messages(logger, 'YFMLINT')).toHaveLength(0);
        expect(messages(logger)).toHaveLength(0);
        getFileTokens('child.md', state, {log: logger}, 'plain');
        getFileTokens('child.md', state, {log: logger}, 'plain');
        expect(messages(logger)).toHaveLength(2);
    });

    test('helper diagnostics do not activate unrelated custom engine options or mutate config', () => {
        const logger = consumer();
        const state = {md: new MarkdownIt(), env: {}} as StateCore;
        const custom = {preserved: true};
        const options = Object.freeze({
            log: logger,
            vars: {value: 'World'},
            substitutions: false,
            custom,
        });
        const tokens = getFileTokens('custom.md', state, options, '{{ value }}');
        expect(tokens[1].content).toBe('World');
        expect(options.substitutions).toBe(false);
        expect(options.custom).toBe(custom);
        expect(messages(logger)).toHaveLength(1);
    });

    test('bundled lint warns before cache early return and preserves actual rule diagnostics', () => {
        const logger = consumer();
        const pluginOptions = {log: getLogger(logger), path: 'legacy-engine-lint.md'};
        const options = {
            input: '# title\n',
            pluginOptions,
            lintConfig: {default: false, MD041: true, 'log-levels': {MD041: log.LogLevels.WARN}},
        };
        yfmlint(options);
        yfmlint(options);
        expect(messages(logger, 'YFMLINT')).toHaveLength(2);
        const deprecations = createDeprecationReporter({log: logger});
        yfmlint({...options, pluginOptions: {...pluginOptions, deprecations}});
        yfmlint({...options, pluginOptions: {...pluginOptions, deprecations}});
        expect(messages(logger, 'YFMLINT')).toHaveLength(3);
        yfmlint({
            input: 'plain\n',
            pluginOptions: {...pluginOptions, path: 'legacy-engine-lint-rule.md'},
            lintConfig: {default: false, MD041: true, 'log-levels': {MD041: log.LogLevels.WARN}},
        });
        expect(logger.warn.mock.calls.some(([message]) => String(message).includes('MD041'))).toBe(
            true,
        );
    });
});
