const {bold} = require('chalk');

const applyConditions = require('./conditions');
const applySubstitutions = require('./substitutions');
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

            const codeWithVars = code.replace(varsRe, (match, groupNotVar, groupVar, groupVarValue) => {
                if (groupNotVar !== groupVar) {
                    return groupVar;
                }

                const trimVarPath = groupVarValue.trim();

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

module.exports = (originInput, vars, path, settings = {}) => {
    const {conditions = true, substitutions = true, conditionsInCode = false} = settings;
    let input = conditionsInCode ? originInput : saveCode(originInput, vars, path);

    if (conditions) {
        input = applyConditions(input, vars, path);
    }

    if (substitutions) {
        input = applySubstitutions(input, vars, path);
    }

    input = conditionsInCode ? input : repairCode(input);
    codes.length = 0;

    return input;
};
