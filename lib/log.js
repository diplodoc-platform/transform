const {green, yellow, red} = require('chalk');
const {LOG_LEVELS} = require('./constants');

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

        problems[type].push(problem);
    };
}

module.exports = {
    [LOG_LEVELS.INFO]: createLogger(LOG_LEVELS.INFO),
    [LOG_LEVELS.WARN]: createLogger(LOG_LEVELS.WARN),
    [LOG_LEVELS.ERROR]: createLogger(LOG_LEVELS.ERROR),
    LOG_LEVELS,
    get: () => problems,
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
