const {bold} = require('chalk');
const {platform} = require('process');

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

const сarriage = platform === 'win32' ? '\r\n' : '\n';

module.exports = {nestedCloseTokenIdxFactory, сarriage};
