const {bold} = require('chalk');

const {getObject} = require('./../utils');
const log = require('../log');

function substitutions(md, {vars, path}) {
    md.core.ruler.push('substitutions', ({tokens}) => {
        tokens.forEach((token) => {
            if (token.type !== 'inline') {
                return;
            }

            token.children.forEach((childToken) => {
                if (!childToken.content) {
                    return;
                }

                childToken.content = childToken.content.replace(
                    /\{{2}([^\}]+)\}{2}/g,
                    (_, varPath) => {
                        const value = getObject(varPath.trim(), vars);

                        if (value === undefined) {
                            log.warn(`Variable not found: ${bold(varPath)} in ${bold(path)}`);
                        }

                        return value;
                    }
                );
            });
        });
    });
}

module.exports = substitutions;
