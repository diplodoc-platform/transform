import applySubstitutions from './substitutions';
import {prepareSourceMap} from './sourceMap';

import applyCycles from './cycles';
import applyConditions from './conditions';

import ArgvService, {ArgvSettings} from './services/argv';
import {Dictionary} from 'lodash';

const codes: string[] = [];
const regexp = /`{3}(((?!`{3})[^])+)`{3}/g;

function saveCode(
    str: string,
    vars: Record<string, unknown>,
    path?: string,
    substitutions?: boolean,
) {
    let i = 0;

    return str.replace(regexp, (_, code: string) => {
        i++;

        const codeWithVars = substitutions ? applySubstitutions(code, vars, path) : code;

        codes.push(codeWithVars);

        /* Keep the same count of lines to avoid transformation of the source map */
        const codeLines = codeWithVars.split('\n');
        const emptyLines = codeLines.length > 1 ? codeLines.reduce((acc) => acc + '\n', '') : '';

        return '```' + i + emptyLines + '```';
    });
}

function repairCode(str: string) {
    return str.replace(regexp, (_, code) => {
        const number = code.trimRight();
        return '```' + codes[number - 1] + '```';
    });
}

function liquid<
    B extends boolean = false,
    C = B extends false ? string : {output: string; sourceMap: Dictionary<string>},
>(
    originInput: string,
    vars: Record<string, unknown>,
    path?: string,
    settings?: ArgvSettings & {withSourceMap?: B},
): C {
    const {
        cycles = true,
        conditions = true,
        substitutions = true,
        conditionsInCode = false,
        keepNotVar = false,
        withSourceMap,
    } = settings || {};

    ArgvService.init({
        cycles,
        conditions,
        substitutions,
        conditionsInCode,
        keepNotVar,
        withSourceMap,
    });

    let output = conditionsInCode ? originInput : saveCode(originInput, vars, path, substitutions);

    let sourceMap: Record<number, number> = {};

    if (withSourceMap) {
        const lines = output.split('\n');
        sourceMap = lines.reduce((acc: Record<number, number>, _cur, index) => {
            acc[index + 1] = index + 1;

            return acc;
        }, {});
    }

    if (cycles) {
        output = applyCycles(output, vars, path, {sourceMap});
    }

    if (conditions) {
        output = applyConditions(output, vars, path, {sourceMap});
    }

    if (substitutions) {
        output = applySubstitutions(output, vars, path);
    }

    output = conditionsInCode ? output : repairCode(output);
    codes.length = 0;

    if (withSourceMap) {
        return {
            output,
            sourceMap: prepareSourceMap(sourceMap),
        } as unknown as C;
    }

    return output as unknown as C;
}

// 'export default' instead of 'export = ' because of circular dependency with './cycles.ts'.
// somehow it breaks import in './cycles.ts' and imports nothing
export default liquid;
