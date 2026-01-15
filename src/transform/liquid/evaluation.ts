import getObject from '../getObject';
import {log} from '../log';

import * as lexical from './lexical';
import filters from './filters';
import {SkippedEvalError} from './errors';

type Scope = Record<string, unknown>;

type WithFilter = (l: string, filter: (s: string) => boolean, exp: string) => boolean;
type NoFilter = (l: string, r: string, exp: string) => boolean;
type DotOperator = (
    l: Record<string, (...args: unknown[]) => unknown>,
    r: string,
    exp: string,
) => boolean;

const operators: Record<string, WithFilter | NoFilter | DotOperator> = {
    '==': ((l, r) => l === r) as NoFilter,
    '!=': ((l, r) => l !== r) as NoFilter,
    '>': ((l, r) => l !== null && r !== null && l > r) as NoFilter,
    '<': ((l, r) => l !== null && r !== null && l < r) as NoFilter,
    '>=': ((l, r) => l !== null && r !== null && l >= r) as NoFilter,
    '<=': ((l, r) => l !== null && r !== null && l <= r) as NoFilter,
    contains: ((l, r) => l !== null && r !== null && l.includes(r)) as NoFilter,
    and: ((l, r) => isTruthy(l) && isTruthy(r)) as NoFilter,
    or: ((l, r) => isTruthy(l) || isTruthy(r)) as NoFilter,
    '|': ((l, filter, exp) => {
        try {
            return filter(l);
        } catch {
            if (!filter) {
                throw new SkippedEvalError('Cannot apply an unsupported filter', exp);
            }

            throw new SkippedEvalError('There are some problems with the filter', exp);
        }
    }) as WithFilter,
    '.': ((l, r, exp) => {
        const parsed = lexical.getParsedMethod(r);

        try {
            if (!parsed) {
                throw new Error();
            }
            const {name, args} = parsed;

            return l[name](...args);
        } catch {
            if (!l) {
                throw new SkippedEvalError(
                    `Cannot apply the function '${name}' on an undefined variable`,
                    exp,
                );
            }

            throw new SkippedEvalError('There are some problems with the function', exp);
        }
    }) as DotOperator,
};

export const NoValue = Symbol('NoValue');

function evalValue(originStr: string, scope: Scope, strict: boolean) {
    const str = originStr && originStr.trim();
    if (!str) {
        return undefined;
    }

    if (lexical.isLiteral(str)) {
        return lexical.parseLiteral(str);
    }
    if (lexical.isVariable(str)) {
        return getObject(str, scope, strict ? NoValue : undefined);
    }

    throw new TypeError(`cannot eval '${str}' as value`);
}

function isTruthy(val: unknown) {
    return !isFalsy(val);
}

function isFalsy(val: unknown) {
    return val === false || undefined === val || val === null;
}

const operatorREs = lexical.operators.map(
    (op) =>
        new RegExp(
            `^(${lexical.quoteBalanced.source})(${op.source})(${lexical.quoteBalanced.source})$`,
        ),
);

export function evalExp(
    exp: string,
    scope: Record<string, unknown>,
    strict = false,
):
    | string[]
    | number[]
    | boolean
    | string
    | symbol
    | undefined
    | ((input: string) => number | string) {
    if (Object.getOwnPropertyNames(filters).includes(exp.trim())) {
        return filters[exp.trim() as keyof typeof filters];
    }

    if (lexical.isSupportedMethod(exp)) {
        return exp;
    }

    try {
        for (let i = 0; i < operatorREs.length; i++) {
            const operatorRE = operatorREs[i];
            const match = exp.match(operatorRE);
            if (match) {
                const operator = match[2].trim();
                if (operator === '.' && !lexical.isSupportedMethod(match[3].trim())) {
                    break;
                }

                const op = operators[operator];
                const l = evalExp(match[1], scope, strict);
                const r = evalExp(match[3], scope, strict);

                if (l === NoValue || r === NoValue) {
                    return NoValue;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return op(l as any, r as any, exp);
            }
        }

        const match = exp.match(lexical.rangeLine);
        if (match) {
            const low = Number(evalValue(match[1], scope, strict));
            const high = Number(evalValue(match[2], scope, strict));
            const range = [];

            for (let j = low; j <= high; j++) {
                range.push(j);
            }

            return range;
        }

        return evalValue(exp, scope, strict);
    } catch (e) {
        if (e instanceof SkippedEvalError) {
            log.warn(`Skip error: ${e}`);
            return undefined;
        }

        log.error(`Error: ${e}`);
    }

    return undefined;
}

export default (exp: string, scope: Record<string, unknown>, strict = false) =>
    Boolean(evalExp(exp, scope, strict));
