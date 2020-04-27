const {green, yellow, red} = require('chalk');

const problems = {
    info: [],
    warn: [],
    error: [],
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
    info: createLogger('info'),
    warn: createLogger('warn'),
    error: createLogger('error'),
    get: () => problems,
};
