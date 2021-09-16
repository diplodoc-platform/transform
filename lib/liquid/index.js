const applyCycles = require('./cycles');
const applyConditions = require('./conditions');
const applySubstitutions = require('./substitutions');

const {prepareSourceMap} = require('./sourceMap');

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

            /* Keep the same count of lines to avoid transformation of the source map */
            const codeLines = codeWithVars.split('\n');
            const emptyLines = codeLines.length > 1 ? codeLines.reduce((acc) => acc + '\n', '') : '';

            return '```' + i + emptyLines + '```';
        },
    );
}

function repairCode(str) {
    return str.replace(
        regexp,
        (_, code) => {
            const number = code.trimRight();
            return '```' + codes[number - 1] + '```';
        },
    );
}

module.exports = (originInput, vars, path, settings = {}) => {
    const {
        cycles = true, conditions = true, substitutions = true, conditionsInCode = false, withSourceMap = false,
    } = settings;
    let output = conditionsInCode ? originInput : saveCode(originInput, vars, path, substitutions);


    let sourceMap;
    if (withSourceMap) {
        const lines = output.split('\n');
        sourceMap = lines.reduce((acc, cur, index) => {
            acc[index + 1] = index + 1;
            return acc;
        }, {});
    }

    if (cycles) {
        output = applyCycles(output, vars, path, {sourceMap});
    }

    if (conditions) {
        output = applyConditions(output, vars, path, {sourceMap});
    }

    if (substitutions) {
        output = applySubstitutions(output, vars, path);
    }

    output = conditionsInCode ? output : repairCode(output);
    codes.length = 0;

    if (withSourceMap) {
        return {
            output,
            sourceMap: prepareSourceMap(sourceMap),
        };
    }

    return output;
};
