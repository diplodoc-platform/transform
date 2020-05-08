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

            const codeWithVars = code.replace(varsRe, (match, varPath) => {
                const trimVarPath = varPath.trim();

                let value = getObject(trimVarPath, vars);

                if (value === undefined) {
                    value = match;

                    log.warn(`Variable ${bold(trimVarPath)} not found${path ? ` in ${bold(path)}` : ''}`);
                }

                return value;
            });

            codes.push(codeWithVars);

            return '```' + i + '```';
        },
    );
}

function repairCode(str) {
    return str.replace(
        regexp,
        (_, number) => '```' + codes[number - 1] + '```',
    );
}

module.exports = (originInput, vars, path) => {
    let input = saveCode(originInput, vars, path);

    input = conditions(input, vars, path);

    input = substitutions(input, vars, path);

    input = repairCode(input);
    codes.length = 0;

    return input;
};
