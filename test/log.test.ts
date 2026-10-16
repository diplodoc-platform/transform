import {vi} from 'vitest';

import {getLogger, log} from '../src/transform/log';
import transform from '../src/transform';

beforeEach(() => log.clear());

describe('caller logger integration', () => {
    test('keeps the default logger and normalizes an external logger only once', () => {
        const consumer = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        expect(getLogger()).toBe(log);
        const logger = getLogger(consumer);
        expect(getLogger(consumer)).toBe(logger);
        expect(getLogger(logger)).toBe(logger);
    });

    test('forwards each level with the consumer context and retains diagnostics', () => {
        class Consumer {
            messages: string[] = [];
            info(message: string) {
                this.messages.push(`info:${message}`);
            }
            warn(message: string) {
                this.messages.push(`warn:${message}`);
            }
            error(message: string) {
                this.messages.push(`error:${message}`);
            }
        }
        const consumer = new Consumer();
        const logger = getLogger(consumer);
        logger.info('progress');
        logger.warn('warning');
        logger.error('failure');
        expect(consumer.messages).toEqual(['info:progress', 'warn:warning', 'error:failure']);
        expect(log.get().info.join()).toContain('progress');
        expect(log.get().warn.join()).toContain('warning');
        expect(log.get().error.join()).toContain('failure');
    });

    test('suppresses repeated warnings until cleared without suppressing errors', () => {
        const consumer = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        const logger = getLogger(consumer);
        logger.warn('warning');
        logger.warn('warning');
        logger.error('failure');
        logger.error('failure');
        expect(consumer.warn).toHaveBeenCalledOnce();
        expect(consumer.error).toHaveBeenCalledTimes(2);
        logger.clear();
        logger.warn('warning');
        expect(consumer.warn).toHaveBeenCalledTimes(2);
    });
    test('passes the caller logger to ordinary Markdown plugins and preprocessors', () => {
        const consumer = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
        const {logs} = transform('text', {
            log: consumer,
            preprocessors: [
                (input, options) => {
                    options.log?.warn('preprocessor warning');
                    return input;
                },
            ],
            plugins: [
                (_md, options) => {
                    options.log.info('plugin progress');
                    options.log.error('plugin failure');
                },
            ],
        });
        expect(consumer.info).toHaveBeenCalledWith('plugin progress');
        expect(consumer.warn).toHaveBeenCalledWith('preprocessor warning');
        expect(consumer.error).toHaveBeenCalledWith('plugin failure');
        expect(logs.warn.join()).toContain('preprocessor warning');
        expect(logs.error.join()).toContain('plugin failure');
    });
});
