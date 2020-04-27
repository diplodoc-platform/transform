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
}

declare let log: Logger;

export default log;

