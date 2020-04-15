const {join} = require('path');
const {bold} = require('chalk');
const log = require('../log');
const {resolveRelativePath, isLocalUrl, isFileExists} = require('../utils');

function replaceImageSrc(token, state, {assetsPublicPath = '/', root, path: optsPath}) {
    const src = token.attrGet('src');
    const currentPath = state.env.path || optsPath;

    if (!isLocalUrl(src)) {
        return;
    }

    const path = resolveRelativePath(currentPath, src);

    if (isFileExists(path)) {
        state.md.assets.push(path);
    } else {
        log.warn(`Asset not found: ${bold(src)} in ${bold(currentPath)}`);
    }

    const relativeToRoot = path.replace(root + '/', '');
    const publicSrc = join(assetsPublicPath, relativeToRoot);

    token.attrSet('src', publicSrc);
}

function images(md, opts) {
    md.assets = [];

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
