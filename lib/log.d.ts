export interface Logs {
    info: string[];
    warn: string[];
    error: string[];
}

export interface Logger {
    info: Function;
    warn: Function;
    error: Function;
    get: () => Logs;
    add: (logs: Logs) => void;
    clear: () => void;
    isEmpty: () => boolean;
    LOG_LEVELS: {
        DISABLED: string;
        INFO: string;
        WARN: string;
        ERROR: string;
    };
}

declare let log: Logger;

export default log;

