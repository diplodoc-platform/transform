'use strict';
const {join} = require('path');
const {resolveRelativePath} = require('../utils');

function isLocalSrc(src) {
    return !/^(?:[a-z]+:)?\/\//i.test(src);
}

function replaceImageSrc(token, opts) {
    const src = token.attrGet('src');

    if (!isLocalSrc(src)) {
        return;
    }

    const path = resolveRelativePath(opts.path, src);
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
                    replaceImageSrc(childrenTokens[j], opts);
                }

                j++;
            }

            i++;
        }
    });
}

module.exports = images;
