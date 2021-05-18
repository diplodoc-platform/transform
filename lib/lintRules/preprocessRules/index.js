const {withLintRuleWrapper} = require('../utils');

const inlineCodeMaxLen = withLintRuleWrapper(require('./inlineCodeMaxLen'));
const titleSyntax = withLintRuleWrapper(require('./titleSyntax'));

module.exports = {
    inlineCodeMaxLen,
    titleSyntax,
};
