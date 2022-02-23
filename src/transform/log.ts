import {green, yellow, red} from 'chalk';

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
        [LogLevels.ERROR]: (msg) => `${red('ERR ')} ${msg}`,
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
