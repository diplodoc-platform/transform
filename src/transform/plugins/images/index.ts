import type Token from 'markdown-it/lib/token';
import type {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import type {ImageOptions, StateCore} from '../../typings';

import {join, sep} from 'path';
import {bold} from 'chalk';
import {optimize} from 'svgo';
import {readFileSync} from 'fs';

import {isFileExists, resolveRelativePath} from '../../utilsFS';
import {getSrcTokenAttr, isExternalHref, isLocalUrl} from '../../utils';

const sanitizeAttribute = (value: string): string => value.replace(/(\d*[%a-z]{0,5}).*/gi, '$1');

interface ImageOpts extends MarkdownItPluginOpts {
    assetsPublicPath: string;
    inlineSvg?: boolean;
}

function replaceImageSrc(
    token: Token,
    state: StateCore,
    {assetsPublicPath = sep, root = '', path: optsPath, log}: ImageOpts,
) {
    const src = getSrcTokenAttr(token);
    const currentPath = state.env.path || optsPath;

    if (!isLocalUrl(src)) {
        return;
    }

    const path = resolveRelativePath(currentPath, src);

    if (isFileExists(path)) {
        state.md.assets?.push(src);
    } else {
        log.error(`Asset not found: ${bold(src)} in ${bold(currentPath)}`);
    }

    const relativeToRoot = path.replace(root + sep, '');
    const publicSrc = join(assetsPublicPath, relativeToRoot);

    token.attrSet('src', publicSrc);
}

interface SVGOpts extends MarkdownItPluginOpts {
    notFoundCb: (s: string) => void;
    imageOpts: ImageOptions;
}

function convertSvg(
    token: Token,
    state: StateCore,
    {path: optsPath, log, notFoundCb, root, imageOpts}: SVGOpts,
) {
    const currentPath = state.env.path || optsPath;
    const path = resolveRelativePath(currentPath, getSrcTokenAttr(token));

    try {
        const raw = readFileSync(path).toString();
        const content = raw === '' ? '' : replaceSvgContent(raw, imageOpts);
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

                    const imgSrc = getSrcTokenAttr(childrenTokens[j]);
                    const shouldInlineSvg =
                        (childrenTokens[j].attrGet('inline') === null
                            ? opts.inlineSvg !== false
                            : childrenTokens[j].attrGet('inline') === 'true') &&
                        !isExternalHref(imgSrc);

                    if (imgSrc.endsWith('.svg') && shouldInlineSvg) {
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

function replaceSvgContent(content: string, options: ImageOptions) {
    // monoline
    content = content.replace(/>\r?\n</g, '><').replace(/\r?\n/g, ' ');

    // width, height
    let svgRoot = content.replace(/.*?<svg([^>]*)>.*/g, '$1');

    const {width, height} = svgRoot
        .match(/(?:width="(.*?)")|(?:height="(.*?)")/g)
        ?.reduce((acc: {[key: string]: string}, val) => {
            const [key, value] = val.split('=');
            acc[key] = value;
            return acc;
        }, {}) || {width: undefined, height: undefined};

    if (!width && options.width) {
        const sanitizedWidth = sanitizeAttribute(options.width.toString());
        svgRoot = `${svgRoot} width="${sanitizedWidth}"`;
    }
    if (!height && options.height) {
        const sanitizedHeight = sanitizeAttribute(options.height.toString());
        svgRoot = `${svgRoot} height="${sanitizedHeight}"`;
    }
    if ((!width && options.width) || (!height && options.height)) {
        content = content.replace(/.*?<svg([^>]*)>/, `<svg${svgRoot}>`);
    }

    // randomize ids
    content = optimize(content, {
        plugins: [
            {
                name: 'prefixIds',
                params: {
                    prefix: 'rnd-' + Math.floor(Math.random() * 1e9).toString(16),
                    prefixClassNames: false,
                },
            },
        ],
    }).data;

    return content;
}

// Create an object that is the index function with an additional replaceSvgContent property
const imagesPlugin: typeof index & {replaceSvgContent: typeof replaceSvgContent} = Object.assign(
    index,
    {
        replaceSvgContent,
    },
);

export = imagesPlugin;
