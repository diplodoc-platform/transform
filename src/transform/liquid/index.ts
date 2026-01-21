import type {Dictionary} from 'lodash';
import type {ArgvSettings} from './services/argv';

import cloneDeepWith from 'lodash/cloneDeepWith';

import {composeFrontMatter, extractFrontMatter} from '../frontmatter';

import applySubstitutions from './substitutions';
import {prepareSourceMap} from './sourceMap';
import applyCycles from './cycles';
import applyConditions from './conditions';
import ArgvService from './services/argv';

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
    codes: string[],
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

function repairCode(str: string, codes: string[]) {
    return replace(fence, fence, (code) => codes[Number(code)], str);
}

function liquidSnippet<
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
        useLegacyConditions = false,
        keepNotVar = false,
        withSourceMap,
    } = settings || {};

    ArgvService.init({
        cycles,
        conditions,
        substitutions,
        conditionsInCode,
        useLegacyConditions,
        keepNotVar,
        withSourceMap,
    });

    const codes: string[] = [];

    let output = conditionsInCode
        ? originInput
        : saveCode(originInput, vars, codes, path, substitutions);

    let sourceMap: Record<number, number> = {};

    if (withSourceMap) {
        const lines = output.split('\n');
        sourceMap = lines.reduce((acc: Record<number, number>, _cur, index) => {
            acc[index + 1] = index + 1;

            return acc;
        }, {});
    }

    if (conditions) {
        const strict = conditions === 'strict';
        output = applyConditions(output, vars, path, {sourceMap, strict, useLegacyConditions});
    }

    if (cycles) {
        output = applyCycles(output, vars, path, {sourceMap});
    }

    if (substitutions) {
        output = applySubstitutions(output, vars, path);
    }

    if (!conditionsInCode && typeof output === 'string') {
        output = repairCode(output, codes);
    }

    codes.length = 0;

    if (withSourceMap) {
        return {
            output,
            sourceMap: prepareSourceMap(sourceMap),
        } as unknown as C;
    }

    return output as unknown as C;
}

function linesCount(content: string) {
    let count = 1,
        index = -1;
    while ((index = content.indexOf('\n', index + 1)) > -1) {
        count++;
    }

    return count;
}

function liquidDocument<
    B extends boolean = false,
    C = B extends false ? string : {output: string; sourceMap: Dictionary<string>},
>(
    input: string,
    vars: Record<string, unknown>,
    path?: string,
    settings?: ArgvSettings & {withSourceMap?: B},
): C {
    const [frontMatter, strippedContent] = extractFrontMatter(input, path);

    const liquidedFrontMatter = cloneDeepWith(frontMatter, (value: unknown) =>
        typeof value === 'string'
            ? liquidSnippet(value, vars, path, {...settings, withSourceMap: false})
            : undefined,
    );

    const liquidedResult = liquidSnippet(strippedContent, vars, path, settings);
    const liquidedContent =
        typeof liquidedResult === 'object' ? liquidedResult.output : liquidedResult;

    const output = composeFrontMatter(liquidedFrontMatter, liquidedContent as string);

    if (typeof liquidedResult === 'object') {
        const inputLinesCount = linesCount(input);
        const outputLinesCount = linesCount(output);
        const contentLinesCount = linesCount(strippedContent);
        const contentLinesDiff = linesCount(liquidedContent as string) - contentLinesCount;

        const fullLinesDiff = outputLinesCount - inputLinesCount;

        // Always >= 0
        const sourceOffset = inputLinesCount - contentLinesCount;
        // Content lines diff already counted in source map
        const resultOffset = fullLinesDiff - contentLinesDiff;

        liquidedResult.sourceMap = Object.fromEntries(
            Object.entries(liquidedResult.sourceMap).map(([lineInResult, lineInSource]) => [
                (Number(lineInResult) + resultOffset).toString(),
                (Number(lineInSource) + sourceOffset).toString(),
            ]),
        );
    }

    // typeof check for better inference; the catch is that return of liquidSnippet can be an
    // object even with source maps off, see `substitutions.test.ts`
    return (settings?.withSourceMap && typeof liquidedResult === 'object'
        ? {
              output,
              sourceMap: liquidedResult.sourceMap,
          }
        : output) as unknown as C;
}

// both default and named exports for convenience
export {liquidDocument, liquidSnippet};
export default liquidDocument;
