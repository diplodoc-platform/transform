const {bold} = require('chalk');

const nestedCloseTokenIdxFactory = (tokenName, matchOpenToken, matchCloseToken) => (tokens, idx, path, log) => {
    let level = 0;
    let i = idx;
    while (i < tokens.length) {
        if (matchOpenToken(tokens, i)) {
            level++;
        } else if (matchCloseToken(tokens, i)) {
            if (level === 0) {
                return i;
            }
            level--;
        }

        i++;
    }

    log.error(`${tokenName} must be closed${path ? ` in ${bold(path)}` : ''}`);

    return null;
};

module.exports = {nestedCloseTokenIdxFactory};
