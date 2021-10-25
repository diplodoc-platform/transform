const {bold} = require('chalk');

const ArgvService = require('./services/argv');
const getObject = require('../getObject');
const {evalExp} = require('./evaluation');
const log = require('../log');
const {vars: varsRe, isVariable} = require('./lexical');

const substitutions = (str, builtVars, path) => {
    const {keepNotVar} = ArgvService.getConfig();

    return str.replace(
        varsRe,
        (match, _groupNotVar, flag, groupVar, groupVarValue) => {
            if (flag) {
                return keepNotVar ? _groupNotVar : groupVar;
            }

            const trimVarPath = groupVarValue.trim();

            if (trimVarPath.startsWith('.')) {
                return groupVar;
            }

            let value;
            if (isVariable(trimVarPath)) {
                value = getObject(trimVarPath, builtVars);
            } else {
                value = evalExp(trimVarPath, builtVars);
            }

            if (value === undefined) {
                value = match;

                log.warn(`Variable ${bold(trimVarPath)} not found${path ? ` in ${bold(path)}` : ''}`);
            }

            return value;
        },
    );
};

module.exports = substitutions;
