const lexical = require('./lexical');
const getObject = require('../getObject');
const log = require('../log');

const operators = {
    '==': (l, r) => l === r,
    '!=': (l, r) => l !== r,
    '>': (l, r) => l !== null && r !== null && l > r,
    '<': (l, r) => l !== null && r !== null && l < r,
    '>=': (l, r) => l !== null && r !== null && l >= r,
    '<=': (l, r) => l !== null && r !== null && l <= r,
    'and': (l, r) => isTruthy(l) && isTruthy(r),
    'or': (l, r) => isTruthy(l) || isTruthy(r),
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

    try {
        for (let i = 0; i < operatorREs.length; i++) {
            const operatorRE = operatorREs[i];
            const expRE = new RegExp(
                `^(${lexical.quoteBalanced.source})(${operatorRE.source})(${lexical.quoteBalanced.source})$`,
            );
            if ((match = exp.match(expRE))) {
                const l = evalExp(match[1], scope);
                const op = operators[match[2].trim()];
                const r = evalExp(match[3], scope);
                return op(l, r);
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
        log.error(`Error: ${e}`);

        return false;
    }
}

module.exports = (exp, scope) => Boolean(evalExp(exp, scope));
