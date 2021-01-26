const {readFileSync} = require('fs');
const {join} = require('path');
const {bold} = require('chalk');

const {resolveRelativePath, isFileExists} = require('../../utilsFS');
const {isLocalUrl, isExternalHref} = require('../../utils');

function replaceImageSrc(token, state, {assetsPublicPath = '/', root = '', path: optsPath, log}) {
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

function convertSvg(token, state, {path: optsPath, log, notFoundCb, root}) {
    const currentPath = state.env.path || optsPath;
    const path = resolveRelativePath(currentPath, token.attrGet('src'));

    try {
        const content = readFileSync(path, 'utf8');
        const svgToken = new state.Token('image_svg', '', 0);
        svgToken.attrSet('content', content);

        return svgToken;
    } catch (e) {
        log.error(`SVG ${path} from ${currentPath} not found`);

        if (notFoundCb) {
            notFoundCb(path.replace(root, ''));
        }

        return token;
    }
}

function index(md, opts) {
    md.assets = [];

    const plugin = (state) => {
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
                    const imgSrc = childrenTokens[j].attrGet('src');

                    if (imgSrc.endsWith('.svg') && !isExternalHref(imgSrc)) {
                        childrenTokens[j] = convertSvg(childrenTokens[j], state, opts);
                    } else {
                        replaceImageSrc(childrenTokens[j], state, opts);
                    }
                }

                j++;
            }

            i++;
        }
    };

    try {
        md.core.ruler.before('includes', 'images', plugin);
    } catch (e) {
        md.core.ruler.push('images', plugin);
    }

    md.renderer.rules.image_svg = (tokens, index) => {
        const token = tokens[index];

        return token.attrGet('content');
    };
}

module.exports = index;
