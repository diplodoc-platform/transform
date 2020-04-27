const {bold} = require('chalk');

const getObject = require('../getObject');
const log = require('../log');
const {vars: varsRe} = require('./lexical');

const substitutions = (str, builtVars, path) => (
    str.replace(
        varsRe,
        (match, varPath) => {
            const trimVarPath = varPath.trim();

            let value = getObject(trimVarPath, builtVars);

            if (value === undefined) {
                value = match;

                log.warn(`Variable ${bold(trimVarPath)} not found${path ? ` in ${bold(path)}` : ''}`);
            }

            return value;
        },
    )
);

module.exports = substitutions;
