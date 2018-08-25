'use strict';
const {green, yellow, red} = require('chalk');


function createLogger(type) {
    const formatter = {
        info: (msg) => `${green('INFO')} ${msg}`,
        warn: (msg) => `${yellow('WARN')} ${msg}`,
        error: (msg) => `${red('ERROR')} ${msg}`
    };

    return function log(msg) {
        console.log(formatter[type](msg));
    };
}


module.exports = {
    info: createLogger('info'),
    warn: createLogger('warn'),
    error: createLogger('error')
};
