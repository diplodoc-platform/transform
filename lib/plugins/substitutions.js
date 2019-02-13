const {bold} = require('chalk');

const {getObject} = require('./../utils');
const log = require('../log');

function substitutions(md, {vars, path, skipErrors}) {
    const transform = (str) => (
        str.replace(
            /\{{2}([^\}]+)\}{2}/g,
            (_, varPath) => {
                varPath = varPath.trim();

                let value = getObject(varPath, vars);

                if (value === undefined) {
                    if (skipErrors) {
                        value = varPath;
                    }

                    log.warn(`Variable not found: ${bold(varPath)} in ${bold(path)}`);
                }

                return value;
            }
        )
    );

    md.core.ruler.push('substitutions', ({tokens}) => {
        tokens.forEach((token) => {
            if (token.type !== 'inline') {
                return;
            }

            token.children.forEach((childToken) => {
                if (childToken.content) {
                    childToken.content = transform(childToken.content);

                    return;
                }

                if (childToken.type === 'link_open') {
                    const href = childToken.attrs.find(([name]) => name === 'href');
                    href[1] = transform(decodeURIComponent(href[1]));

                    return;
                }
            });
        });
    });
}

module.exports = substitutions;
