// quote related
const singleQuoted = /'[^']*'/;
const doubleQuoted = /"[^"]*"/;

const quoted = new RegExp(`${singleQuoted.source}|${doubleQuoted.source}`);
const quoteBalanced = new RegExp(`(?:${quoted.source}|[^'"])*`);

const vars = /((not_var)?({{2}([. \w-|(),]+)}{2}))/gm;

// basic types
const number = /-?\d+\.?\d*|\.?\d+/;
const bool = /true|false/;

// property access
const identifier = /[\w-]+[?]?/;
const subscript = new RegExp(`\\[(?:${quoted.source}|[\\w-\\.]+)\\]`);
const literal = new RegExp(`(?:${quoted.source}|${bool.source}|${number.source})`);
const variable = new RegExp(`${identifier.source}(?:\\.${identifier.source}|${subscript.source})*`);

// range related
const rangeLimit = new RegExp(`(?:${variable.source}|${number.source})`);
const rangeCapture = new RegExp(`\\((${rangeLimit.source})\\.\\.(${rangeLimit.source})\\)`);

// full match
const tagLine = new RegExp(`^\\s*(${identifier.source})\\s*([\\s\\S]*)\\s*$`);
const literalLine = new RegExp(`^${literal.source}$`, 'i');
const variableLine = new RegExp(`^${variable.source}$`);
const numberLine = new RegExp(`^${number.source}$`);
const boolLine = new RegExp(`^${bool.source}$`, 'i');
const quotedLine = new RegExp(`^${quoted.source}$`);
const rangeLine = new RegExp(`^${rangeCapture.source}$`);

const operators = [
    /\s+or\s+/,
    /\s+and\s+/,
    /[=]=|!=|<=|>=|<|>|\s+contains\s+|\|/,
    /\./,
];

const prepareArgsForMethods = {
    'slice': (args) => args.map((arg) => Number(arg)),
};
const supportedMethods = Object.keys(prepareArgsForMethods);
const supportedMethodsRE = new RegExp(`^(${supportedMethods.join('\\|')})[^(]*\\(([^)]*)\\)$`);
const isSupportedMethod = (exp) => {
    return supportedMethodsRE.test(exp);
};
const getParsedMethod = (exp) => {
    const match = exp.match(supportedMethodsRE);
    const name = match[1];
    const args = match[2].split(/[\s,]+/);
    return {
        name,
        args,
    };
};

const isLiteral = (str) => literalLine.test(str);
const isVariable = (str) => variableLine.test(str);

function parseLiteral(str) {
    let res = str.match(numberLine);

    if (res) {
        return Number(str);
    }
    res = str.match(boolLine);
    if (res) {
        return str.toLowerCase() === 'true';
    }
    res = str.match(quotedLine);
    if (res) {
        return str.slice(1, -1);
    }

    throw new TypeError(`cannot parse '${str}' as literal`);
}

module.exports = {
    vars,
    quoteBalanced,
    tagLine,
    rangeLine,
    operators,
    variable,
    isLiteral,
    isVariable,
    parseLiteral,
    isSupportedMethod,
    getParsedMethod,
};
