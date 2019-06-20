const {bold} = require('chalk');

const getObject = require('../getObject');
const log = require('../log');
const {vars: varsRe} = require('./lexical');

const substitutions = (str, builtVars, path) => (
    str.replace(
        varsRe,
        (match, varPath) => {
            varPath = varPath.trim();

            let value = getObject(varPath, builtVars);

            if (value === undefined) {
                value = match;

                log.warn(`Variable ${bold(varPath)} not found in ${bold(path)}`);
            }

            return value;
        }
    )
);

module.exports = substitutions;
