const {bold} = require('chalk');

const getObject = require('../getObject');
const log = require('../log');

const substitutions = (str, builtVars, skipErrors) => (
    str.replace(
        /\{{2}([^\}]+)\}{2}/g,
        (_, varPath) => {
            varPath = varPath.trim();

            let value = getObject(varPath, builtVars);

            if (value === undefined) {
                if (skipErrors) {
                    value = varPath;
                }

                log.warn(`Variable not found: ${bold(varPath)}`);
            }

            return value;
        }
    )
);

module.exports = substitutions;
