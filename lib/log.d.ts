export interface Logs {
    info: string[];
    warn: string[];
    error: string[];
}

enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

export interface Logger {
    info: Function;
    warn: Function;
    error: Function;
    get: () => Logs;
    clear: () => void;
    isEmpty: () => boolean;
    LOG_LEVELS: LogLevels;
}

declare let log: Logger;

export default log;

