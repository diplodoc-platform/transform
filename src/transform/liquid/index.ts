import applySubstitutions from './substitutions';
import {prepareSourceMap} from './sourceMap';

import applyCycles from './cycles';
import applyConditions from './conditions';
import applyChangelogs from './changelogs';

import ArgvService, {ArgvSettings} from './services/argv';
import {Dictionary} from 'lodash';

const codes: string[] = [];

const fence = '```';

const find = (open: string, close: string, string: string, index: number) => {
    const start = string.indexOf(open, index);
    const end = start > -1 ? string.indexOf(close, start + open.length) : -1;

    return [start, end];
};

const replace = (
    open: string,
    close: string,
    value: (string: string) => string,
    string: string,
) => {
    let result = '';
    let carriage = 0;
    let [start, end] = find(open, close, string, carriage);

    while (start > -1 && end > -1) {
        const fragment = string.slice(start + open.length, end);

        result += string.slice(carriage, start) + open + value(fragment) + close;
        carriage = end + close.length;
        [start, end] = find(open, close, string, carriage);
    }

    result += string.slice(carriage);

    return result;
};

function saveCode(
    str: string,
    vars: Record<string, unknown>,
    path?: string,
    substitutions?: boolean,
) {
    return replace(
        fence,
        fence,
        (code) => {
            const codeWithVars = substitutions ? applySubstitutions(code, vars, path) : code;
            const index = codes.push(codeWithVars) - 1;

            /* Keep the same count of lines to avoid transformation of the source map */
            const codeLines = codeWithVars.split('\n');
            const emptyLines = codeLines.length > 1 ? '\n'.repeat(codeLines.length) : '';

            return `${index}${emptyLines}`;
        },
        str,
    );
}

function repairCode(str: string) {
    return replace(fence, fence, (code) => codes[Number(code)], str);
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
        changelogs = false,
        conditionsInCode = false,
        keepNotVar = false,
        withSourceMap,
    } = settings || {};

    ArgvService.init({
        cycles,
        conditions,
        substitutions,
        changelogs,
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

    if (changelogs) {
        const result = applyChangelogs(output, vars, path);
        output = result.output;
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
