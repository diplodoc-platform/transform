import {join, sep} from 'path';
import {bold} from 'chalk';
import {optimize} from 'svgo';
import Token from 'markdown-it/lib/token';

import {resolveRelativePath} from '../../utilsFS';
import {isExternalHref, isLocalUrl} from '../../utils';
import {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import {FsContext, StateCore} from '../../typings';
import {defaultFsContext} from '../../fsContext';

interface ImageOpts extends MarkdownItPluginOpts {
    assetsPublicPath: string;
    inlineSvg?: boolean;
}

function replaceImageSrc(
    fs: FsContext,
    token: Token,
    state: StateCore,
    {assetsPublicPath = sep, root = '', path: optsPath, log, deps}: ImageOpts,
) {
    const src = token.attrGet('src') || '';
    const currentPath = state.env.path || optsPath;

    if (!isLocalUrl(src)) {
        return;
    }

    const path = resolveRelativePath(currentPath, src);

    deps?.markDep?.(currentPath, path, 'image');

    if (fs.exist(path)) {
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
}

function prefix() {
    const value = Math.floor(Math.random() * 1e9);

    return value.toString(16);
}

function convertSvg(
    fs: FsContext,
    token: Token,
    state: StateCore,
    {path: optsPath, log, notFoundCb, root, deps}: SVGOpts,
) {
    const currentPath = state.env.path || optsPath;
    const path = resolveRelativePath(currentPath, token.attrGet('src') || '');

    try {
        deps?.markDep?.(currentPath, path, 'image');

        const raw = fs.read(path).toString();
        const result = optimize(raw, {
            plugins: [
                {
                    name: 'prefixIds',
                    params: {
                        prefix: prefix(),
                    },
                },
            ],
        });

        const content = result.data;
        const svgToken = new state.Token('image_svg', '', 0);
        svgToken.attrSet('content', content);

        return svgToken;
    } catch (e: unknown) {
        log.error(`SVG ${path} from ${currentPath} not found`);

        if (notFoundCb) {
            notFoundCb(path.replace(root, ''));
        }

        return token;
    }
}

type Opts = SVGOpts & ImageOpts;

const index: MarkdownItPluginCb<Opts> = (md, opts) => {
    const fs = opts.fs ?? defaultFsContext;

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
                    const shouldInlineSvg = opts.inlineSvg !== false && !isExternalHref(imgSrc);

                    if (imgSrc.endsWith('.svg') && shouldInlineSvg) {
                        childrenTokens[j] = convertSvg(fs, childrenTokens[j], state, opts);
                    } else {
                        replaceImageSrc(fs, childrenTokens[j], state, opts);
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
