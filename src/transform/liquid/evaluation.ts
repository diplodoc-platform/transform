import * as lexical from './lexical';
import getObject from '../getObject';
import {log} from '../log';
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
    and: ((l, r) => isTruthy(l) && isTruthy(r)) as NoFilter,
    or: ((l, r) => isTruthy(l) || isTruthy(r)) as NoFilter,
    '|': ((l, filter, exp) => {
        try {
            return filter(l);
        } catch (e) {
            if (!filter) {
                throw new SkippedEvalError('Cannot apply an unsupported filter', exp);
            }

            throw new SkippedEvalError('There are some problems with the filter', exp);
        }
    }) as WithFilter,
    '.': ((l, r, exp) => {
        const parsed = lexical.getParsedMethod(r);

        try {
            if (!parsed) throw new Error();
            const {name, args} = parsed;

            return l[name](...args);
        } catch (e) {
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

function evalValue(originStr: string, scope: Scope) {
    const str = originStr && originStr.trim();
    if (!str) {
        return undefined;
    }

    if (lexical.isLiteral(str)) {
        return lexical.parseLiteral(str);
    }
    if (lexical.isVariable(str)) {
        return getObject(str, scope);
    }

    throw new TypeError(`cannot eval '${str}' as value`);
}

function isTruthy(val: unknown) {
    return !isFalsy(val);
}

function isFalsy(val: unknown) {
    return val === false || undefined === val || val === null;
}

export function evalExp(
    exp: string,
    scope: Record<string, unknown>,
): string[] | boolean | string | undefined | ((input: string) => number | string) {
    const operatorREs = lexical.operators;
    let match;

    if (Object.getOwnPropertyNames(filters).includes(exp.trim())) {
        return filters[exp.trim() as keyof typeof filters];
    }

    if (lexical.isSupportedMethod(exp)) {
        return exp;
    }

    try {
        for (let i = 0; i < operatorREs.length; i++) {
            const operatorRE = operatorREs[i];
            const expRE = new RegExp(
                `^(${lexical.quoteBalanced.source})(${operatorRE.source})(${lexical.quoteBalanced.source})$`,
            );
            if ((match = exp.match(expRE))) {
                const l = evalExp(match[1], scope);
                const operator = match[2].trim();
                const op = operators[operator];
                const r = evalExp(match[3], scope);

                if (
                    operator !== '.' ||
                    (operator === '.' && lexical.isSupportedMethod(r as string))
                ) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return op(l as any, r as any, exp);
                }
            }
        }

        if ((match = exp.match(lexical.rangeLine))) {
            const low = evalValue(match[1], scope);
            const high = evalValue(match[2], scope);
            const range = [];

            for (let j = low; j <= high; j++) {
                range.push(j);
            }

            return range;
        }

        return evalValue(exp, scope);
    } catch (e) {
        if (e instanceof SkippedEvalError) {
            log.warn(`Skip error: ${e}`);
            return undefined;
        }

        log.error(`Error: ${e}`);
    }

    return undefined;
}

export default (exp: string, scope: Record<string, unknown>) => Boolean(evalExp(exp, scope));
