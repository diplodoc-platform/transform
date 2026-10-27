import type {MarkdownItPluginCb} from '../src/transform/typings';

import {vi} from 'vitest';
import MarkdownIt from 'markdown-it';

import transform from '../src/transform';
import images from '../src/transform/plugins/images';
import {normalizeSvgInline} from '../src/transform/plugins/images/options';
import {createDeprecationReporter} from '../src/transform/deprecation';
import {getLogger, log} from '../src/transform/log';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10"/></svg>';
const MARKDOWN = '![Diagram](diagram.svg)';
const CODE = 'TRANSFORM_INLINE_SVG';
const createConsumer = () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn()});
const sourceOptions = {
    disableLiquid: true,
    path: '/guide.md',
    root: '/',
    rawContent: () => SVG,
    calcPath: () => '/diagram.svg',
    replaceImageSrc: () => '/diagram.svg',
    generateID: () => 'svg-test',
};

function render(options: transform.Options = {}, input = MARKDOWN) {
    return transform(input, {...sourceOptions, plugins: [images], ...options});
}

beforeEach(() => log.clear());

describe('SVG option migration', () => {
    test.each([
        {legacy: undefined, modern: undefined, enabled: true},
        {legacy: undefined, modern: true, enabled: true},
        {legacy: undefined, modern: false, enabled: false},
        {legacy: true, modern: undefined, enabled: true},
        {legacy: true, modern: true, enabled: true},
        {legacy: true, modern: false, enabled: false},
        {legacy: false, modern: undefined, enabled: false},
        {legacy: false, modern: true, enabled: true},
        {legacy: false, modern: false, enabled: false},
    ])(
        'legacy=$legacy modern=$modern renders enabled=$enabled and warns only for the alias',
        ({legacy, modern, enabled}) => {
            const consumer = createConsumer();
            const {result, logs} = render({
                log: consumer,
                ...(legacy === undefined ? {} : {inlineSvg: legacy}),
                ...(modern === undefined ? {} : {svgInline: {enabled: modern}}),
            });

            expect(result.html.includes('<svg')).toBe(enabled);
            expect(result.html.includes('<img')).toBe(!enabled);
            expect(consumer.warn).toHaveBeenCalledTimes(legacy === undefined ? 0 : 1);
            if (legacy === undefined) {
                expect(logs.warn).toEqual([]);
            } else {
                expect(consumer.warn).toHaveBeenCalledWith(
                    expect.stringContaining(
                        '[DEPRECATED TRANSFORM_INLINE_SVG] The inlineSvg option at /guide.md, ' +
                            'option "inlineSvg". Use svgInline.enabled. Removal: version 6.0.0.',
                    ),
                );
                expect(logs.warn.join()).toContain(CODE);
            }
        },
    );

    test('treats undefined legacy and modern enabled values as omitted', () => {
        const consumer = createConsumer();

        expect(
            render({log: consumer, inlineSvg: undefined, svgInline: {enabled: undefined}}).result
                .html,
        ).toContain('<svg');
        expect(consumer.warn).not.toHaveBeenCalled();
        expect(
            render({inlineSvg: false, svgInline: {maxFileSize: SVG.length}}).result.html,
        ).toContain('<img');
    });

    test('preserves a configured size limit, including zero, while filling omitted defaults', () => {
        expect(normalizeSvgInline({})).toEqual({enabled: true, maxFileSize: 2 * 1024 * 1024});
        expect(normalizeSvgInline({svgInline: {enabled: false}})).toEqual({
            enabled: false,
            maxFileSize: 2 * 1024 * 1024,
        });
        expect(render({svgInline: {maxFileSize: SVG.length}}).result.html).toContain('<svg');
        expect(render({svgInline: {maxFileSize: SVG.length - 1}}).result.html).toContain('<img');
        const zero = render({inlineSvg: true, svgInline: {maxFileSize: 0}}).result.html;
        expect(zero).toContain('<img');
        expect(zero).not.toContain('<svg');
    });

    test('retains the default size cap when only enabled is supplied', () => {
        const largeSvg = SVG.replace('/>', ` data-padding="${'x'.repeat(2 * 1024 * 1024)}"/>`);

        expect(render({rawContent: () => largeSvg}).result.html).toContain('<img');
        expect(
            render({svgInline: {enabled: true}, rawContent: () => largeSvg}).result.html,
        ).toContain('<img');
    });

    test('preserves forced inline and opt-out attributes independently of option precedence', () => {
        expect(
            render(
                {inlineSvg: true, svgInline: {enabled: false, maxFileSize: 0}},
                `${MARKDOWN}{inline=true}`,
            ).result.html,
        ).toContain('<svg');
        expect(
            render({inlineSvg: false, svgInline: {enabled: true}}, `${MARKDOWN}{inline=false}`)
                .result.html,
        ).toContain('<img');
    });

    test('shares normalized settings with plugins while preserving custom options and frozen input', () => {
        const customOption = Object.freeze({value: 'unchanged'});
        const svgInline = Object.freeze({enabled: false, maxFileSize: 0});
        const inspect = vi.fn();
        const inspectOptions: MarkdownItPluginCb<{customOption: typeof customOption}> = (
            _md,
            opts,
        ) => {
            inspect(opts.svgInline);
            expect(opts.customOption).toBe(customOption);
            expect(opts.svgInline).not.toBe(svgInline);
        };
        const options = Object.freeze({
            inlineSvg: true,
            svgInline,
            customOption,
            plugins: [images, inspectOptions],
        });

        expect(render(options).result.html).toContain('<img');
        expect(inspect).toHaveBeenCalledWith({enabled: false, maxFileSize: 0});
        expect(options.svgInline).toEqual({enabled: false, maxFileSize: 0});
        expect(options.inlineSvg).toBe(true);
    });

    test('deduplicates repeated images per scope and re-emits in separate Transform calls', () => {
        const consumer = createConsumer();
        const input = `${MARKDOWN}\n\n${MARKDOWN}`;

        render({inlineSvg: false, log: consumer}, input);
        expect(consumer.warn).toHaveBeenCalledOnce();
        render({inlineSvg: false, log: consumer}, input);
        expect(consumer.warn).toHaveBeenCalledTimes(2);
    });

    test('warns for an explicitly supplied alias without requiring a source path or SVG', () => {
        const consumer = createConsumer();

        render({inlineSvg: false, path: undefined, log: consumer}, 'Plain text');

        expect(consumer.warn).toHaveBeenCalledOnce();
        expect(consumer.warn).toHaveBeenCalledWith(expect.stringContaining('option "inlineSvg"'));
        expect(consumer.warn).toHaveBeenCalledWith(
            expect.stringContaining('Removal: version 6.0.0'),
        );
    });
});

describe('direct images plugin registration', () => {
    test.each([
        {inlineSvg: false, svgInline: undefined, enabled: false},
        {inlineSvg: false, svgInline: {enabled: true}, enabled: true},
        {inlineSvg: true, svgInline: {enabled: false}, enabled: false},
    ])('normalizes without mutation and warns through its registration scope: %j', (settings) => {
        const consumer = createConsumer();
        const opts = Object.freeze({...sourceOptions, ...settings, log: getLogger(consumer)});
        const md = new MarkdownIt().use(images, opts);

        expect(md.render(MARKDOWN).includes('<svg')).toBe(settings.enabled);
        md.render(MARKDOWN);
        expect(consumer.warn).toHaveBeenCalledOnce();
        expect(opts.svgInline).toBe(settings.svgInline);

        const another = new MarkdownIt().use(images, opts);
        another.render(MARKDOWN);
        expect(consumer.warn).toHaveBeenCalledTimes(2);
    });

    test('uses a supplied reporter across renders and respects an explicit scope reset', () => {
        const consumer = createConsumer();
        const deprecations = createDeprecationReporter({log: getLogger(consumer)});
        const md = new MarkdownIt().use(images, {
            ...sourceOptions,
            inlineSvg: false,
            log: getLogger(consumer),
            deprecations,
        });

        md.render(MARKDOWN);
        md.render(MARKDOWN);
        expect(consumer.warn).toHaveBeenCalledOnce();
        deprecations.reset();
        md.render(MARKDOWN);
        expect(consumer.warn).toHaveBeenCalledTimes(2);
        expect(log.get().warn.join()).toContain(CODE);
    });

    test('fills modern partial settings without a legacy warning', () => {
        const consumer = createConsumer();
        const md = new MarkdownIt().use(images, {
            ...sourceOptions,
            svgInline: {maxFileSize: 0},
            log: getLogger(consumer),
        });

        expect(md.render(MARKDOWN)).toContain('<img');
        expect(consumer.warn).not.toHaveBeenCalled();
    });
});
