const {bold} = require('chalk');

const getObject = require('../getObject');
const log = require('../log');
const {vars: varsRe} = require('./lexical');

const substitutions = (str, builtVars) => (
    str.replace(
        varsRe,
        (_, varPath) => {
            varPath = varPath.trim();

            let value = getObject(varPath, builtVars);

            if (value === undefined) {
                value = `{{${varPath}}}`;

                log.warn(`Variable not found: ${bold(varPath)}`);
            }

            return value;
        }
    )
);

module.exports = substitutions;
