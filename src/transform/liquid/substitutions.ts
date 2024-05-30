import {bold} from 'chalk';

import ArgvService from './services/argv';
import getObject from '../getObject';
import {evalExp} from './evaluation';
import {log} from '../log';
import {
    isSingleVariable,
    isVariable,
    singleVariable as singleVariableRe,
    vars as varsRe,
} from './lexical';

const substitutions = (str: string, builtVars: Record<string, unknown>, path?: string) => {
    const {keepNotVar} = ArgvService.getConfig();

    if (isSingleVariable(str)) {
        const match = str.match(singleVariableRe);

        if (!match) {
            return str;
        }

        const trimVarPath = match[1].trim();
        const value = substituteVariable(trimVarPath, builtVars);

        if (value === undefined) {
            logNotFoundVariable(trimVarPath, path);

            return str;
        }

        return value;
    }

    return str.replace(varsRe, (match, _groupNotVar, flag, groupVar, groupVarValue) => {
        if (flag) {
            return keepNotVar ? _groupNotVar : groupVar;
        }

        const trimVarPath = groupVarValue.trim();

        if (trimVarPath.startsWith('.')) {
            return groupVar;
        }

        const value = substituteVariable(trimVarPath, builtVars);

        if (value === undefined) {
            logNotFoundVariable(trimVarPath, path);

            return match;
        }

        return value;
    });
};

function logNotFoundVariable(varPath: string, path?: string) {
    log.warn(`Variable ${bold(varPath)} not found${path ? ` in ${bold(path)}` : ''}`);
}

function substituteVariable(varPath: string, builtVars: Record<string, unknown>) {
    let value;
    if (isVariable(varPath)) {
        value = getObject(varPath, builtVars);
    } else {
        value = evalExp(varPath, builtVars);
    }

    return value;
}

export = substitutions;
