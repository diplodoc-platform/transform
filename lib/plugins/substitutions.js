const {getObject} = require('./../utils');

function substitutions(md, {vars}){
    md.core.ruler.push('substitutions', (state) => {
        const {tokens} = state;

        tokens.forEach(token => {
            if (token.type !== 'inline') {
                return;
            }

            token.children.forEach(childToken => {
                if (!childToken.content) {
                    return;
                }

                childToken.content = childToken.content.replace(
                    /\{{2}([^\}]+)\}{2}/g,
                    (_, path) => getObject(path.trim(), vars)
                );
            });
        });
    });
}

module.exports = substitutions;
