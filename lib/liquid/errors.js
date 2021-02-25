const {bold} = require('chalk');

function SkippedEvalError(message, exp) {
    this.name = 'SkippedEvalError';
    this.message = `${message}: ${bold(exp)}`;
}

SkippedEvalError.prototype = Object.create(Error.prototype);

module.exports = {
    SkippedEvalError,
};
