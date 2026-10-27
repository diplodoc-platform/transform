import type {DeprecationDescriptor, DeprecationUsage} from '../src/transform/deprecation';
import type {MarkdownItPluginCb} from '../src/transform/typings';

import {expectTypeOf, vi} from 'vitest';

import transform from '../src/transform';
import {createDeprecationReporter} from '../src/transform/deprecation';
import {getLogger, log} from '../src/transform/log';

const descriptor: DeprecationDescriptor = {
    code: 'TEST_LEGACY_FEATURE',
    feature: 'Example legacy syntax',
    replacement: 'example current syntax',
    removal: {version: '6.0.0', date: '2027-01-01'},
};

const usage: DeprecationUsage = {
    location: {path: 'guide.md', line: 3, column: 4},
    option: 'exampleOption',
};

const createConsumer = () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn()});

beforeEach(() => log.clear());

describe('deprecation scopes', () => {
    test('reports the stable code, feature, occurrence, replacement and removal target', () => {
        const consumer = createConsumer();
        const reporter = createDeprecationReporter({log: consumer});

        reporter.warn(descriptor, usage);

        expect(consumer.warn).toHaveBeenCalledOnce();
        expect(consumer.warn).toHaveBeenCalledWith(
            '[DEPRECATED TEST_LEGACY_FEATURE] Example legacy syntax at guide.md:3:4, ' +
                'option "exampleOption". Use example current syntax. ' +
                'Removal: version 6.0.0, date 2027-01-01.',
        );
        expect(log.get().warn.join()).toContain('[DEPRECATED TEST_LEGACY_FEATURE]');
    });

    test.each([{version: '6.0.0'}, {date: '2027-01-01'}])(
        'supports either removal target and an option without a source location: %j',
        (removal) => {
            const consumer = createConsumer();
            createDeprecationReporter({log: consumer}).warn(
                {...descriptor, removal},
                {option: 'exampleOption'},
            );

            expect(consumer.warn).toHaveBeenCalledOnce();
            expect(consumer.warn.mock.calls[0][0]).toContain('option "exampleOption"');
            expect(consumer.warn.mock.calls[0][0]).not.toContain('undefined');
        },
    );

    test('requires a removal target and an occurrence in the typed contract', () => {
        expectTypeOf<{}>().not.toMatchTypeOf<DeprecationDescriptor['removal']>();
        expectTypeOf<{}>().not.toMatchTypeOf<DeprecationUsage>();
    });

    test('rejects empty migration information for JavaScript callers', () => {
        const reporter = createDeprecationReporter();

        expect(() => reporter.warn({...descriptor, replacement: ''}, usage)).toThrow(TypeError);
        expect(() => reporter.warn({...descriptor, removal: {version: ''}}, usage)).toThrow(
            TypeError,
        );
        expect(() => reporter.warn(descriptor, {option: ''})).toThrow(TypeError);
    });

    test('deduplicates by code and occurrence without dropping distinct locations or options', () => {
        const consumer = createConsumer();
        const reporter = createDeprecationReporter({log: consumer});

        reporter.warn(descriptor, usage);
        reporter.warn({...descriptor, feature: 'Changed message text'}, usage);
        reporter.warn(descriptor, {location: {path: 'guide.md', line: 5, column: 4}});
        reporter.warn(descriptor, {location: {path: 'other.md', line: 3, column: 4}});
        reporter.warn(descriptor, {...usage, option: 'anotherOption'});
        reporter.warn({...descriptor, code: 'TEST_ANOTHER_FEATURE'}, usage);

        expect(consumer.warn).toHaveBeenCalledTimes(5);
    });

    test('independent scopes and reset re-emit through a normalized logger', () => {
        const consumer = createConsumer();
        const logger = getLogger(consumer);
        const first = createDeprecationReporter({log: logger});
        const second = createDeprecationReporter({log: logger});
        log.info('keep existing diagnostic');

        first.warn(descriptor, usage);
        first.warn(descriptor, usage);
        second.warn(descriptor, usage);
        first.reset();
        first.warn(descriptor, usage);

        expect(consumer.warn).toHaveBeenCalledTimes(3);
        expect(log.get().info.join()).toContain('keep existing diagnostic');
        expect(log.get().warn).toHaveLength(1);

        logger.warn('ordinary warning');
        logger.warn('ordinary warning');
        expect(consumer.warn).toHaveBeenCalledTimes(4);
    });

    test('does not record an occurrence when forwarding throws', () => {
        const consumer = createConsumer();
        consumer.warn.mockImplementationOnce(() => {
            throw new Error('consumer failure');
        });
        const reporter = createDeprecationReporter({log: consumer});

        expect(() => reporter.warn(descriptor, usage)).toThrow('consumer failure');
        reporter.warn(descriptor, usage);

        expect(consumer.warn).toHaveBeenCalledTimes(2);
    });

    test('reads only explicit compatibility choices without prototype or wildcard fallbacks', () => {
        const compatibility = {TEST_LEGACY_FEATURE: 'legacy' as const, '*': 'legacy' as const};
        const reporter = createDeprecationReporter({compatibility});

        expect(reporter.compatibility(descriptor.code)).toBe('legacy');
        expect(reporter.compatibility('TEST_UNKNOWN_FEATURE')).toBe('current');
        expect(reporter.compatibility('toString')).toBe('current');
    });
});

describe('transform deprecation integration', () => {
    test('shares one scope across plugin and preprocessor and forwards to the injected logger', () => {
        const consumer = createConsumer();
        const customOption = {enabled: true};
        const plugin: MarkdownItPluginCb<{customOption: typeof customOption}> = (_md, options) => {
            expect(options.customOption).toBe(customOption);
            expect(options.deprecations?.compatibility(descriptor.code)).toBe('legacy');
            options.deprecations?.warn(descriptor, usage);
        };

        const output = transform('text', {
            log: consumer,
            customOption,
            compatibility: {[descriptor.code]: 'legacy'},
            plugins: [plugin],
            preprocessors: [
                (input, options) => {
                    options.deprecations?.warn(descriptor, usage);
                    return input;
                },
            ],
        });

        expect(consumer.warn).toHaveBeenCalledOnce();
        expect(output.logs.warn.join()).toContain('[DEPRECATED TEST_LEGACY_FEATURE]');
        expect(output.result.html).toBe('<p>text</p>\n');
    });

    test('fresh transform calls re-emit with the same path and logger, including after failure', () => {
        const consumer = createConsumer();
        let fail = false;
        const plugin: MarkdownItPluginCb = (md, options) => {
            md.core.ruler.push('test-deprecation', () => {
                options.deprecations?.warn(descriptor, {location: {path: options.path}});
                if (fail) {
                    throw new Error('plugin failure');
                }
            });
        };
        const options = {log: consumer, path: 'guide.md', plugins: [plugin]};

        transform('first', options);
        fail = true;
        expect(() => transform('second', options)).toThrow('plugin failure');
        fail = false;
        transform('third', options);

        expect(consumer.warn).toHaveBeenCalledTimes(3);
    });

    test('does not warn or change defaults merely because compatibility was configured', () => {
        const consumer = createConsumer();
        const ordinary = transform('# Heading', {log: consumer});
        const configured = transform('# Heading', {
            log: consumer,
            compatibility: {[descriptor.code]: 'legacy'},
        });

        expect(configured.result).toEqual(ordinary.result);
        expect(consumer.warn).not.toHaveBeenCalled();
    });
});
