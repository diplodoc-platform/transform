export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

/** Minimal logging contract accepted from embedding applications. */
export type LogConsumer = Pick<Logger, LogLevels.INFO | LogLevels.WARN | LogLevels.ERROR>;

/**
 * Create a collector with execution-host formatting and private adapter caches.
 * @param labels - Formatting for the three established diagnostic labels.
 * @returns Collector and forwarding helpers sharing only this host's state.
 */
export function createDiagnosticHost(labels: {
    info: () => string;
    warn: () => string;
    error: () => string;
}) {
    const problems: Record<LogLevels, string[]> = {
        [LogLevels.INFO]: [],
        [LogLevels.WARN]: [],
        [LogLevels.ERROR]: [],
        [LogLevels.DISABLED]: [],
    };

    function createLogger(type: LogLevels) {
        const formatter: Record<string, (v: string) => string> = {
            [LogLevels.INFO]: (msg) => `${labels.info()} ${msg}`,
            [LogLevels.WARN]: (msg) => `${labels.warn()} ${msg}`,
            [LogLevels.ERROR]: (msg) => `${labels.error()} ${msg}`,
        };

        return function log(msg: string) {
            const problem = formatter[type](msg);

            if (!problems[type].includes(problem)) {
                problems[type].push(problem);
            }
        };
    }

    const log = {
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

    type Logger = typeof log;

    /** Minimal logging contract accepted from embedding applications. */

    const externalLoggers = new WeakMap<LogConsumer, Logger>();
    const externalConsumers = new WeakMap<LogConsumer, LogConsumer>();

    /**
     * Forward a warning whose deduplication is owned by an explicit caller scope.
     *
     * @param message - Formatted warning to retain and forward.
     * @param consumer - Optional embedding logger, including a normalized adapter.
     * @returns Nothing. Generic logger warning deduplication is unaffected.
     */
    function warnInScope(message: string, consumer?: LogConsumer): void {
        log.warn(message);

        if (consumer && consumer !== log) {
            (externalConsumers.get(consumer) ?? consumer).warn(message);
        }
    }

    /**
     * Preserve collected diagnostics and forward messages to the caller's logger.
     * @param {LogConsumer} consumer Optional external logger.
     * @returns {Logger} The cached adapter or the default diagnostic collector.
     */
    function getLogger(consumer?: LogConsumer): Logger {
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
        externalConsumers.set(logger, consumer);
        return logger;
    }

    return {log, getLogger, warnInScope};
}

export type Logger = ReturnType<typeof createDiagnosticHost>['log'];
