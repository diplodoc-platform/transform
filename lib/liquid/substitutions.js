const getObject = require('../getObject');
const {evalExp} = require('./evaluation');
const log = require('../log');
const {vars: varsRe, isVariable} = require('./lexical');
const {logVariableNotFound} = require('../lintRules/liquidRules');

const substitutions = (str, {vars: builtVars, path, lintOptions, disableLint} = {}) => (
    str.replace(
        varsRe,
        (match, _groupNotVar, flag, groupVar, groupVarValue) => {
            if (flag) {
                return groupVar;
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

                logVariableNotFound({
                    lintOptions,
                    commonOptions: {
                        path,
                        varPath: trimVarPath,
                        disableLint,
                        log,
                    },
                });
            }

            return value;
        },
    )
);

module.exports = substitutions;
