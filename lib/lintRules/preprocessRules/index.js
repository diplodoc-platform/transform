const {withLintRuleWrapper} = require('../utils');

const inlineCodeMaxLen = withLintRuleWrapper(require('./inlineCodeMaxLen'));

module.exports = {
    inlineCodeMaxLen,
};
