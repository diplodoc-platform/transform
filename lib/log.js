
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

        if (type === 'info') {
            console.log(problem);
        } else {
            console.error(problem);
        }
    };
}

function log(msg) {
    return console.log(msg);
}

function all() {
    console.log(
        Object.keys(problems)
            .map((type) => problems[type].join('\n'))
            .join('\n\n'),
    );
}

function hasErrors() {
    return problems.error.length;
}

log.info = createLogger('info');
log.warn = createLogger('warn');
log.error = createLogger('error');
log.hasErrors = hasErrors;
log.all = all;

module.exports = log;
