const {bold} = require('chalk');

const {getObject} = require('./../utils');
const log = require('../log');
const {buildVars} = require('../vars');

function substitutions(md, {vars, varsPreset, path, root, skipErrors}) {
    const transform = (str, builtVars) => (
        str.replace(
            /\{{2}([^\}]+)\}{2}/g,
            (_, varPath) => {
                varPath = varPath.trim();

                let value = getObject(varPath, builtVars);

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

    md.core.ruler.push('substitutions', ({tokens, env}) => {
        const builtVars = buildVars(vars, varsPreset, env.path || path, root);

        tokens.forEach((token) => {
            if (token.type !== 'inline') {
                return;
            }

            token.children.forEach((childToken) => {
                if (childToken.content) {
                    childToken.content = transform(childToken.content, builtVars);

                    return;
                }

                if (childToken.type === 'link_open') {
                    const href = childToken.attrs.find(([name]) => name === 'href');
                    href[1] = transform(decodeURIComponent(href[1]), builtVars);

                    return;
                }
            });
        });
    });
}

module.exports = substitutions;
