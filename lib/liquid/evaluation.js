const lexical = require('./lexical');
const getObject = require('../getObject');
const log = require('../log');
const filters = require('./filters');
const {SkippedEvalError} = require('./errors');

const operators = {
    '==': (l, r) => l === r,
    '!=': (l, r) => l !== r,
    '>': (l, r) => l !== null && r !== null && l > r,
    '<': (l, r) => l !== null && r !== null && l < r,
    '>=': (l, r) => l !== null && r !== null && l >= r,
    '<=': (l, r) => l !== null && r !== null && l <= r,
    'and': (l, r) => isTruthy(l) && isTruthy(r),
    'or': (l, r) => isTruthy(l) || isTruthy(r),
    '|': (l, filter, exp) => {
        try {
            return filter(l);
        } catch (e) {
            if (!filter) {
                throw new SkippedEvalError('Cannot apply an unsupported filter', exp);
            }

            throw new SkippedEvalError('There are some problems with the filter', exp);
        }
    },
    '.': (l, r, exp) => {
        const {name, args} = lexical.getParsedMethod(r);
        try {
            return l[name](...args);
        } catch (e) {
            if (!l) {
                throw new SkippedEvalError(`Cannot apply the function '${name}' on an undefined variable`, exp);
            }

            throw new SkippedEvalError('There are some problems with the function', exp);
        }
    },
};

function evalValue(originStr, scope) {
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

function isTruthy(val) {
    return !isFalsy(val);
}

function isFalsy(val) {
    return val === false || undefined === val || val === null;
}

function evalExp(exp, scope) {
    const operatorREs = lexical.operators;
    let match;

    if (filters[exp.trim()]) {
        return filters[exp.trim()];
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

                if (operator !== '.' || operator === '.' && lexical.isSupportedMethod(r)) {
                    return op(l, r, exp);
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

module.exports = (exp, scope) => Boolean(evalExp(exp, scope));
module.exports.evalExp = evalExp;
