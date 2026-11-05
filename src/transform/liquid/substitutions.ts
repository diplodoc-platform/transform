import type {LogConsumer} from '../log-core';

import {bold} from 'chalk';

import getObject from '../getObject';
import {log as defaultLog} from '../log';

import ArgvService from './services/argv';
import {evalExp} from './evaluation';
import {
    isSingleVariable,
    isVariable,
    singleVariable as singleVariableRe,
    vars as varsRe,
} from './lexical';

const substitutions = (
    str: string,
    builtVars: Record<string, unknown>,
    path?: string,
    log: LogConsumer = defaultLog,
) => {
    const {keepNotVar} = ArgvService.getConfig();

    if (isSingleVariable(str)) {
        const match = str.match(singleVariableRe);

        if (!match) {
            return str;
        }

        const trimVarPath = match[1].trim();
        const value = substituteVariable(trimVarPath, builtVars, log);

        if (value === undefined) {
            logNotFoundVariable(trimVarPath, path, log);

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

        const value = substituteVariable(trimVarPath, builtVars, log);

        if (value === undefined) {
            logNotFoundVariable(trimVarPath, path, log);

            return match;
        }

        return value;
    });
};

function logNotFoundVariable(varPath: string, path: string | undefined, log: LogConsumer) {
    log.warn(`Variable ${bold(varPath)} not found${path ? ` in ${bold(path)}` : ''}`);
}

function substituteVariable(varPath: string, builtVars: Record<string, unknown>, log: LogConsumer) {
    let value;
    if (isVariable(varPath)) {
        value = getObject(varPath, builtVars);
    } else {
        value = evalExp(varPath, builtVars, false, log);
    }

    return value;
}

export default substitutions;
