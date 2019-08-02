'use strict';
const {bold} = require('chalk');

const conditions = require('./conditions');
const substitutions = require('./substitutions');
const getObject = require('../getObject');
const log = require('../log');
const {vars: varsRe} = require('./lexical');

const codes = [];
const regexp = /`{3}(((?!`{3})[^])+)`{3}/g;

function saveCode(str, vars, path) {
    let i = 0;

    return str.replace(
        regexp,
        (_, code) => {
            i++;

            code = code.replace(varsRe, (match, varPath) => {
                varPath = varPath.trim();

                let value = getObject(varPath, vars);

                if (value === undefined) {
                    value = match;

                    log.warn(`Variable ${bold(varPath)} not found in ${bold(path)}`);
                }

                return value;
            });

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

module.exports = (input, vars, path, settings = {conditions: true, substitutions: true}) => {
    input = saveCode(input, vars, path);
    if (settings.conditions) {
        input = conditions(input, vars, path);
    }
    if (settings.substitutions) {
        input = substitutions(input, vars, path);
    }
    input = repairCode(input);
    codes.length = 0;

    return input;
};
