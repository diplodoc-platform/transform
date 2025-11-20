import type Token from 'markdown-it/lib/token';
import type {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import type {ImageOptions, StateCore} from '../../typings';

import {join, sep} from 'path';
import {bold} from 'chalk';
import {optimize} from 'svgo';
import {readFileSync} from 'fs';

import {isFileExists, resolveRelativePath} from '../../utilsFS';
import {filterTokens, getSrcTokenAttr, isExternalHref} from '../../utils';

const sanitizeAttribute = (value: string): string => value.replace(/(\d*[%a-z]{0,5}).*/gi, '$1');

interface ImageOpts extends MarkdownItPluginOpts {
    assetsPublicPath: string;
    inlineSvg?: boolean;
}

function replaceImageSrc(
    state: StateCore,
    currentPath: string,
    path: string,
    imgSrc: string,
    {assetsPublicPath = sep, root = '', log}: ImageOpts,
) {
    if (isFileExists(path)) {
        state.md.assets?.push(imgSrc);
    } else {
        log.error(`Asset not found: ${bold(imgSrc)} in ${bold(currentPath)}`);
    }

    const relativeToRoot = path.replace(root + sep, '');
    const publicSrc = join(assetsPublicPath, relativeToRoot);

    return publicSrc;
}

interface SVGOpts extends MarkdownItPluginOpts {
    notFoundCb: (s: string) => void;
    imageOpts: ImageOptions;
}

function convertSvg(
    token: Token,
    state: StateCore,
    {
        file: path,
        log,
        notFoundCb,
        assets,
        rootFile,
        root,
        forceInlineSvg,
        imageOpts,
        rawContent,
        svgInline: {maxFileSize},
    }: Opts,
) {
    try {
        let raw = rawContent(path, assets);
        if (!raw) {
            throw new Error('Asset not found');
        }
        raw = raw === true ? '' : raw;
        if (raw.length > maxFileSize) {
            if (forceInlineSvg) {
                log.warn(`Svg size more than in params but forced inline: ${bold(path)}`);
            } else {
                log.info(`Svg size more than in params: ${bold(path)}`);
                token.attrSet('YFM011', `Svg size more than ${maxFileSize}`);
                return null;
            }
        }
        const content = raw === '' ? '' : replaceSvgContent(raw, imageOpts);
        const svgToken = new state.Token('image_svg', '', 0);
        svgToken.attrSet('content', content);

        return svgToken;
    } catch (e: unknown) {
        log.error(`SVG ${path} from ${rootFile} not found`);

        if (notFoundCb) {
            notFoundCb(path.replace(root, ''));
        }

        return token;
    }
}

type Opts = SVGOpts &
    ImageOpts & {
        rawContent: (path: string, assets: Record<string, string | boolean>) => string | boolean;
        calcPath: (root: string, path: string) => string;
        replaceImageSrc: (
            state: StateCore,
            currentPath: string,
            path: string,
            imgSrc: string,
            opts: ImageOpts,
        ) => string;
        forceInlineSvg: boolean;
        assets: Record<string, string>;
        file: string;
        rootFile: string;
        svgInline: {
            enabled: boolean;
            maxFileSize: number;
        };
    };

const getRawFile = (path: string) => {
    return readFileSync(path, 'utf8').toString();
};

const index: MarkdownItPluginCb<Opts> = (md, opts) => {
    const {
        rawContent = getRawFile,
        calcPath = resolveRelativePath,
        replaceImageSrc: replaceImage = replaceImageSrc,
    } = opts;
    // TODO:goldserg need remove support opts.inlineSvg
    if (opts.inlineSvg !== undefined) {
        opts.svgInline = {
            ...opts.svgInline,
            enabled: opts.inlineSvg,
        };
    }
    md.assets = [];

    const plugin = (state: StateCore) => {
        const tokens = state.tokens;

        filterTokens(tokens, 'inline', (inline, {commented}) => {
            if (commented || !inline.children) {
                return;
            }

            const childrenTokens = inline.children || [];

            filterTokens(childrenTokens, 'image', (image, {commented, index}) => {
                const didPatch = image.attrGet('yfm_patched') || false;

                if (didPatch || commented) {
                    return;
                }

                const imgSrc = getSrcTokenAttr(image);
                const forceInlineSvg = image.attrGet('inline') === 'true';
                const shouldInlineSvg =
                    image.attrGet('inline') === null
                        ? opts.svgInline.enabled !== false
                        : forceInlineSvg;
                const imageOpts = {
                    width: image.attrGet('width'),
                    height: image.attrGet('height'),
                    inline: shouldInlineSvg,
                };

                if (isExternalHref(imgSrc)) {
                    return;
                }

                const root = state.env.path || opts.path;
                const file = calcPath(root, imgSrc);

                if (imgSrc.endsWith('.svg') && shouldInlineSvg) {
                    const svgToken = convertSvg(image, state, {
                        ...opts,
                        rawContent,
                        forceInlineSvg,
                        calcPath,
                        imageOpts,
                        rootFile: root,
                        file,
                    });
                    if (svgToken) {
                        childrenTokens[index] = svgToken;
                    } else {
                        image.attrSet('src', replaceImage(state, root, file, imgSrc, opts));
                        image.attrSet('yfm_patched', '1');
                    }
                } else {
                    image.attrSet('src', replaceImage(state, root, file, imgSrc, opts));
                    image.attrSet('yfm_patched', '1');
                }
            });
        });
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
