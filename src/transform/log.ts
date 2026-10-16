import {green, red, yellow} from 'chalk';

export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

const problems: Record<LogLevels, string[]> = {
    [LogLevels.INFO]: [],
    [LogLevels.WARN]: [],
    [LogLevels.ERROR]: [],
    [LogLevels.DISABLED]: [],
};

function createLogger(type: LogLevels) {
    const formatter: Record<string, (v: string) => string> = {
        [LogLevels.INFO]: (msg) => `${green('INFO')} ${msg}`,
        [LogLevels.WARN]: (msg) => `${yellow('WARN')} ${msg}`,
        [LogLevels.ERROR]: (msg) => `${red('ERR')} ${msg}`,
    };

    return function log(msg: string) {
        const problem = formatter[type](msg);

        if (!problems[type].includes(problem)) {
            problems[type].push(problem);
        }
    };
}

export const log = {
    [LogLevels.INFO]: createLogger(LogLevels.INFO),
    [LogLevels.WARN]: createLogger(LogLevels.WARN),
    [LogLevels.ERROR]: createLogger(LogLevels.ERROR),
    LogLevels,
    get: () => problems,
    add: (logs: Record<LogLevels, string[]>) => {
        problems[LogLevels.INFO] = problems[LogLevels.INFO].concat(logs[LogLevels.INFO]);
        problems[LogLevels.WARN] = problems[LogLevels.WARN].concat(logs[LogLevels.WARN]);
        problems[LogLevels.ERROR] = problems[LogLevels.ERROR].concat(logs[LogLevels.ERROR]);
    },
    clear: () => {
        problems[LogLevels.INFO] = [];
        problems[LogLevels.WARN] = [];
        problems[LogLevels.ERROR] = [];
    },
    isEmpty: () => {
        return !(
            problems[LogLevels.INFO].length ||
            problems[LogLevels.WARN].length ||
            problems[LogLevels.ERROR].length
        );
    },
};

export type Logger = typeof log;

export default log;

/** Minimal logging contract accepted from embedding applications. */
export type LogConsumer = Pick<Logger, LogLevels.INFO | LogLevels.WARN | LogLevels.ERROR>;

const externalLoggers = new WeakMap<LogConsumer, Logger>();

/**
 * Preserve collected diagnostics and forward messages to the caller's logger.
 * @param {LogConsumer} consumer Optional external logger.
 * @returns {Logger} The cached adapter or the default diagnostic collector.
 */
export function getLogger(consumer?: LogConsumer): Logger {
    if (!consumer || consumer === log) {
        return log;
    }
    const cached = externalLoggers.get(consumer);
    if (cached) {
        return cached;
    }
    const warnings = new Set<string>();
    const logger: Logger = {
        ...log,
        clear() {
            warnings.clear();
            log.clear();
        },
        info(message) {
            log.info(message);
            consumer.info(message);
        },
        warn(message) {
            log.warn(message);
            if (!warnings.has(message)) {
                warnings.add(message);
                consumer.warn(message);
            }
        },
        error(message) {
            log.error(message);
            consumer.error(message);
        },
    };
    externalLoggers.set(consumer, logger);
    // Passing a normalized logger through another helper must not wrap it again.
    externalLoggers.set(logger, logger);
    return logger;
}
