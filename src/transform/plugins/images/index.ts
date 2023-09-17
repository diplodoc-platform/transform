import {readFileSync} from 'fs';
import {join, relative, sep} from 'path';
import {bold} from 'chalk';

import {resolveRelativePath, isFileExists} from '../../utilsFS';
import {isLocalUrl, isExternalHref} from '../../utils';
import Token from 'markdown-it/lib/token';
import {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import {StateCore} from '../../typings';
import {EnvApi} from '../../yfmlint';

interface ImageOpts extends MarkdownItPluginOpts {
    assetsPublicPath: string;
    envApi?: EnvApi;
}

function replaceImageSrc(
    token: Token,
    state: StateCore,
    {assetsPublicPath = sep, root = '', path: optsPath, log, envApi}: ImageOpts,
) {
    const src = token.attrGet('src') || '';
    const currentPath = state.env.path || optsPath;

    if (!isLocalUrl(src)) {
        return;
    }

    const path = resolveRelativePath(currentPath, src);

    let pathExists: boolean;
    if (envApi) {
        pathExists = envApi.fileExistsSync(relative(envApi.root, path));
    } else {
        pathExists = isFileExists(path);
    }

    if (pathExists) {
        state.md.assets?.push(path);
    } else {
        log.error(`Asset not found: ${bold(src)} in ${bold(currentPath)}`);
    }

    const relativeToRoot = path.replace(root + sep, '');
    const publicSrc = join(assetsPublicPath, relativeToRoot);

    token.attrSet('src', publicSrc);
}

interface SVGOpts extends MarkdownItPluginOpts {
    notFoundCb: (s: string) => void;
    envApi?: EnvApi;
}

function convertSvg(
    token: Token,
    state: StateCore,
    {path: optsPath, log, notFoundCb, root, envApi}: SVGOpts,
) {
    const currentPath = state.env.path || optsPath;
    const path = resolveRelativePath(currentPath, token.attrGet('src') || '');

    try {
        let content: string;
        if (envApi) {
            content = envApi?.readFileSync(relative(root, path), 'utf8');
        } else {
            content = readFileSync(path, 'utf8');
        }

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

type Opts = SVGOpts & ImageOpts;

const index: MarkdownItPluginCb<Opts> = (md, opts) => {
    md.assets = [];

    const plugin = (state: StateCore) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            if (tokens[i].type !== 'inline') {
                i++;
                continue;
            }

            const childrenTokens = tokens[i].children || [];
            let j = 0;

            while (j < childrenTokens.length) {
                if (childrenTokens[j].type === 'image') {
                    const didPatch = childrenTokens[j].attrGet('yfm_patched') || false;

                    if (didPatch) {
                        return;
                    }

                    const imgSrc = childrenTokens[j].attrGet('src') || '';

                    if (imgSrc.endsWith('.svg') && !isExternalHref(imgSrc)) {
                        childrenTokens[j] = convertSvg(childrenTokens[j], state, opts);
                    } else {
                        replaceImageSrc(childrenTokens[j], state, opts);
                    }

                    childrenTokens[j].attrSet('yfm_patched', '1');
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

        return token.attrGet('content') || '';
    };
};

export = index;
