export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

export type DiagnosticLogs = Record<LogLevels, string[]>;

export interface DiagnosticCollector {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    get(): DiagnosticLogs;
    add(logs: DiagnosticLogs): void;
    clear(): void;
    isEmpty(): boolean;
}

export interface DiagnosticOptions {
    log?: LogConsumer;
    diagnostics?: DiagnosticCollector;
}

type DiagnosticLabels = {info: () => string; warn: () => string; error: () => string};
const managedLoggers = new WeakMap<LogConsumer, (message: string) => void>();
const scopedAdapters = new WeakMap<LogConsumer, (message: string) => void>();
const managedConsumers = new WeakMap<LogConsumer, () => LogConsumer | undefined>();

/** Minimal logging contract accepted from embedding applications. */
export type LogConsumer = Pick<Logger, LogLevels.INFO | LogLevels.WARN | LogLevels.ERROR>;

/**
 * Create a collector with execution-host formatting and private adapter caches.
 * @param labels - Formatting for the three established diagnostic labels.
 * @param snapshots - Use detached reads and indexed membership for new collectors.
 * @returns Collector and forwarding helpers sharing only this host's state.
 */
export function createDiagnosticHost(labels: DiagnosticLabels, snapshots = false) {
    const problems: Record<LogLevels, string[]> = {
        [LogLevels.INFO]: [],
        [LogLevels.WARN]: [],
        [LogLevels.ERROR]: [],
        [LogLevels.DISABLED]: [],
    };

    const membership: Record<LogLevels, Set<string>> = {
        [LogLevels.INFO]: new Set(),
        [LogLevels.WARN]: new Set(),
        [LogLevels.ERROR]: new Set(),
        [LogLevels.DISABLED]: new Set(),
    };

    function createLogger(type: LogLevels) {
        const formatter: Record<string, (v: string) => string> = {
            [LogLevels.INFO]: (msg) => `${labels.info()} ${msg}`,
            [LogLevels.WARN]: (msg) => `${labels.warn()} ${msg}`,
            [LogLevels.ERROR]: (msg) => `${labels.error()} ${msg}`,
        };

        return function log(msg: string) {
            const problem = formatter[type](msg);

            const indexed = membership[type];
            if (snapshots ? !indexed.has(problem) : !problems[type].includes(problem)) {
                problems[type].push(problem);
                if (snapshots) indexed.add(problem);
            }
        };
    }

    const log = {
        [LogLevels.INFO]: createLogger(LogLevels.INFO),
        [LogLevels.WARN]: createLogger(LogLevels.WARN),
        [LogLevels.ERROR]: createLogger(LogLevels.ERROR),
        LogLevels,
        get: () =>
            snapshots
                ? (Object.fromEntries(
                      Object.entries(problems).map(([level, items]) => [level, [...items]]),
                  ) as DiagnosticLogs)
                : problems,
        add: (logs: Record<LogLevels, string[]>) => {
            for (const level of [LogLevels.INFO, LogLevels.WARN, LogLevels.ERROR]) {
                if (snapshots) {
                    for (const message of logs[level]) {
                        problems[level].push(message);
                        membership[level].add(message);
                    }
                } else {
                    problems[level] = problems[level].concat(logs[level]);
                }
            }
        },
        clear: () => {
            problems[LogLevels.INFO] = [];
            problems[LogLevels.WARN] = [];
            problems[LogLevels.ERROR] = [];
            for (const index of Object.values(membership)) index.clear();
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
        const scoped = consumer && managedLoggers.get(consumer);
        if (scoped) {
            scoped(message);
            return;
        }
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
        if (managedLoggers.has(consumer)) return consumer as Logger;
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
        scopedAdapters.set(logger, (message) => warnInScope(message, logger));
        return logger;
    }

    return {log, getLogger, warnInScope};
}

export type Logger = ReturnType<typeof createDiagnosticHost>['log'];

/**
 * Whether a logger already belongs to an explicitly selected document.
 * @param consumer - Optional embedding logger.
 * @returns Whether helpers should reuse that document sink.
 */
export function isDocumentLogger(consumer: LogConsumer | undefined): consumer is Logger {
    return Boolean(consumer && managedLoggers.has(consumer));
}

/**
 * Create a detached-snapshot collector with indexed membership.
 * @param labels - Execution host labels.
 * @returns An explicitly retained collector.
 */
export function createCollector(labels: DiagnosticLabels): Logger {
    return createDiagnosticHost(labels, true).log;
}

/**
 * Bind a fresh document sink, optional aggregate mirror and external forwarding.
 * @param labels - Execution host labels.
 * @param options - Explicit aggregate mirror and embedding logger.
 * @returns The isolated document logger.
 */
export function createDocumentLogger(
    labels: DiagnosticLabels,
    options: DiagnosticOptions = {},
): Logger {
    const host = createDiagnosticHost(labels, true);
    const inherited = options.log && managedConsumers.get(options.log);
    const external = inherited ? inherited() : options.log;
    const consumer: LogConsumer = {
        info(message) {
            options.diagnostics?.info(message);
            if (external !== options.diagnostics) external?.info(message);
        },
        warn(message) {
            options.diagnostics?.warn(message);
            if (external !== options.diagnostics) external?.warn(message);
        },
        error(message) {
            options.diagnostics?.error(message);
            if (external !== options.diagnostics) external?.error(message);
        },
    };
    const logger = host.getLogger(consumer);
    logger.add = (messages) => {
        host.log.add(messages);
        options.diagnostics?.add(messages);
    };
    managedLoggers.set(logger, (message) => {
        host.log.warn(message);
        options.diagnostics?.warn(message);
        if (external && external !== options.diagnostics) {
            const forward = scopedAdapters.get(external);
            if (forward) forward(message);
            else external.warn(message);
        }
    });
    managedConsumers.set(logger, () => external);
    return logger;
}

/**
 * A parser-owned facade; selection never escapes this parser's closure.
 * @param current - Select the active/latest sink owned by that parser.
 * @returns A stable logger for callbacks installed once.
 */
export function createLoggerFacade(current: () => Logger): Logger {
    const logger: Logger = {
        info: (message) => current().info(message),
        warn: (message) => current().warn(message),
        error: (message) => current().error(message),
        get: () => current().get(),
        add: (messages) => current().add(messages),
        clear: () => current().clear(),
        isEmpty: () => current().isEmpty(),
        LogLevels,
    };
    managedConsumers.set(logger, () => {
        const target = current();
        return managedConsumers.get(target)?.();
    });
    managedLoggers.set(logger, (message) => {
        const target = current();
        const forward = managedLoggers.get(target);
        if (forward) forward(message);
        else target.warn(message);
    });
    return logger;
}
