'use strict';
const {green, yellow, red} = require('chalk');


function createLogger(type) {
    const formatter = {
        info: (msg) => `${green('INFO')} ${msg}`,
        warn: (msg) => `${yellow('WARN')} ${msg}`,
        error: (msg) => `${red('ERR ')} ${msg}`
    };

    return function log(msg) {
        console.log(formatter[type](msg));
    };
}

function log(msg) {
    return console.log(msg);
}

log.info = createLogger('info');
log.warn = createLogger('warn');
log.error = createLogger('error');

module.exports = log;
