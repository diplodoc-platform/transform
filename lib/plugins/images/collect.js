const MarkdownIt = require('markdown-it');
const imsize = require('markdown-it-imsize');
const {relative} = require('path');

const {isLocalUrl} = require('../../utils');
const {resolveRelativePath} = require('../../utilsFS');

// eslint-disable-next-line consistent-return
const collect = (input, options) => {
    const md = new MarkdownIt()
        .use(imsize);

    const {root, path, destPath = '', copyFile, singlePage} = options;
    const tokens = md.parse(input, {});
    let result = input;

    tokens.forEach((token) => {
        if (token.type !== 'inline') {
            return;
        }

        const children = token.children || [];

        children.forEach((childToken) => {
            if (childToken.type !== 'image') {
                return;
            }

            const src = childToken.attrGet('src') || '';

            if (!isLocalUrl(src)) {
                return;
            }

            const targetPath = resolveRelativePath(path, src);
            const targetDestPath = resolveRelativePath(destPath, src);

            if (singlePage && !path.includes('_includes/')) {
                const newSrc = relative(root, resolveRelativePath(path, src));

                result = result.replace(src, newSrc);
            }

            copyFile(targetPath, targetDestPath);
        });
    });

    if (singlePage) {
        return result;
    }
};

module.exports = collect;
