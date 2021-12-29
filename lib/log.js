const {green, yellow, red} = require('chalk');

const LOG_LEVELS = {
    DISABLED: 'disabled',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
};

const problems = {
    [LOG_LEVELS.INFO]: [],
    [LOG_LEVELS.WARN]: [],
    [LOG_LEVELS.ERROR]: [],
};

function createLogger(type) {
    const formatter = {
        info: (msg) => `${green('INFO')} ${msg}`,
        warn: (msg) => `${yellow('WARN')} ${msg}`,
        error: (msg) => `${red('ERR ')} ${msg}`,
    };

    return function log(msg) {
        const problem = formatter[type](msg);

        if (!problems[type].includes(problem)) {
            problems[type].push(problem);
        }
    };
}

module.exports = {
    [LOG_LEVELS.INFO]: createLogger(LOG_LEVELS.INFO),
    [LOG_LEVELS.WARN]: createLogger(LOG_LEVELS.WARN),
    [LOG_LEVELS.ERROR]: createLogger(LOG_LEVELS.ERROR),
    LOG_LEVELS,
    get: () => problems,
    add: (logs) => {
        problems[LOG_LEVELS.INFO] = problems[LOG_LEVELS.INFO].concat(logs[LOG_LEVELS.INFO]);
        problems[LOG_LEVELS.WARN] = problems[LOG_LEVELS.WARN].concat(logs[LOG_LEVELS.WARN]);
        problems[LOG_LEVELS.ERROR] = problems[LOG_LEVELS.ERROR].concat(logs[LOG_LEVELS.ERROR]);
    },
    clear: () => {
        problems[LOG_LEVELS.INFO] = [];
        problems[LOG_LEVELS.WARN] = [];
        problems[LOG_LEVELS.ERROR] = [];
    },
    isEmpty: () => {
        return !(
            problems[LOG_LEVELS.INFO].length ||
            problems[LOG_LEVELS.WARN].length ||
            problems[LOG_LEVELS.ERROR].length
        );
    },
};
