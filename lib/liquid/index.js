const applyCycles = require('./cycles');
const applyConditions = require('./conditions');
const applySubstitutions = require('./substitutions');

const codes = [];
const regexp = /`{3}(((?!`{3})[^])+)`{3}/g;

function saveCode(str, options) {
    const {substitutions} = options;
    let i = 0;

    return str.replace(
        regexp,
        (_, code) => {
            i++;

            const codeWithVars = substitutions ? applySubstitutions(code, options) : code;

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

module.exports = (originInput, options = {}) => {
    const {cycles = true, conditions = true, substitutions = true, conditionsInCode = false} = options;
    let input = conditionsInCode ? originInput : saveCode(originInput, options);

    if (cycles) {
        input = applyCycles(input, options);
    }

    if (conditions) {
        input = applyConditions(input, options);
    }

    if (substitutions) {
        input = applySubstitutions(input, options);
    }

    input = conditionsInCode ? input : repairCode(input);
    codes.length = 0;

    return input;
};
