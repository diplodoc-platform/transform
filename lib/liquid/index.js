'use strict';

const conditions = require('./conditions');
const substitutions = require('./substitutions');

const codes = [];
const regexp = /`{3}(((?!`{3})[^])+)`{3}/g;
function saveCode(str) {
    let i = 0;

    return str.replace(
        regexp,
        (_, code) => {
            i++;
            codes.push(code);

            return '```' + i + '```';
        }
    );
}

function repairCode(str) {
    return str.replace(
        regexp,
        (_, number) => '```' + codes[number - 1] + '```'
    );
}

module.exports = (input, vars, skipErrors) => {
    input = saveCode(input);
    input = conditions(input, vars, skipErrors);
    input = substitutions(input, vars, skipErrors);
    input = repairCode(input);
    codes.length = 0;

    return input;
};
