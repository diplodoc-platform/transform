const applyCycles = require('./cycles');
const applyConditions = require('./conditions');
const applySubstitutions = require('./substitutions');

const codes = [];
const regexp = /`{3}(((?!`{3})[^])+)`{3}/g;

function saveCode(str, vars, path, substitutions) {
    let i = 0;

    return str.replace(
        regexp,
        (_, code) => {
            i++;

            const codeWithVars = substitutions ? applySubstitutions(code, vars, path) : code;

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
    const {cycles = true, conditions = true, substitutions = true, conditionsInCode = false} = settings;
    let input = conditionsInCode ? originInput : saveCode(originInput, vars, path, substitutions);

    if (cycles) {
        input = applyCycles(input, vars, path);
    }

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
