import {bold} from 'chalk';

import ArgvService from './services/argv';
import getObject from '../getObject';
import {evalExp} from './evaluation';
import {log} from '../log';
import {vars as varsRe, isVariable} from './lexical';

const substitutions = (str: string, builtVars: Record<string, unknown>, path?: string) => {
    const {keepNotVar} = ArgvService.getConfig();

    return str.replace(varsRe, (match, _groupNotVar, flag, groupVar, groupVarValue) => {
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
    });
};

export = substitutions;
