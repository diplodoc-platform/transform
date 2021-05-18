const {withLintRuleWrapper} = require('../utils');

const logVariableNotFound = withLintRuleWrapper(require('./logVariableNotFound'));

module.exports = {
    logVariableNotFound,
};
