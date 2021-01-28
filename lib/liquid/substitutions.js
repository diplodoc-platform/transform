const {bold} = require('chalk');

const getObject = require('../getObject');
const {evalExp} = require('./evaluation');
const log = require('../log');
const {vars: varsRe, isVariable} = require('./lexical');

const substitutions = (str, builtVars, path) => (
    str.replace(
        varsRe,
        (match, _groupNotVar, flag, groupVar, groupVarValue) => {
            if (flag) {
                return groupVar;
            }

            const trimVarPath = groupVarValue.trim();

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
    )
);

module.exports = substitutions;
