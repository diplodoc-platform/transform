const {withLintRuleWrapper} = require('../utils');

/* links */
const logEmptyLinkHref = withLintRuleWrapper(require('./links/logEmptyLinkHref'));
const logTitleRefLinkNotFound = withLintRuleWrapper(require('./links/logTitleRefLinkNotFound'));
const logUnreachableLink = withLintRuleWrapper(require('./links/logUnreachableLink'));

module.exports = {
    /* links */
    logEmptyLinkHref,
    logTitleRefLinkNotFound,
    logUnreachableLink,
};
