'use strict';
const {join} = require('path');
const {resolveRelativePath, isLocalUrl} = require('../utils');

function replaceImageSrc(token, state, opts) {
    const src = token.attrGet('src');
    const currentPath = state.env.path || opts.path;

    if (!isLocalUrl(src)) {
        return;
    }

    const path = resolveRelativePath(currentPath, src);
    const relativeToRoot = path.replace(opts.root + '/', '');
    const publicSrc = join(opts.assetsPublicPath, relativeToRoot);

    token.attrSet('src', publicSrc);
}

function images(md, opts) {
    md.core.ruler.before('includes', 'images', (state) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            if (tokens[i].type !== 'inline') {
                i++;
                continue;
            }

            const childrenTokens = tokens[i].children;
            let j = 0;

            while (j < childrenTokens.length) {
                if (childrenTokens[j].type === 'image') {
                    replaceImageSrc(childrenTokens[j], state, opts);
                }

                j++;
            }

            i++;
        }
    });
}

module.exports = images;
