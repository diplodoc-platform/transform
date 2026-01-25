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
    // Normalize path separators to forward slashes for cross-platform compatibility
    return publicSrc.replace(/\\/g, '/');
}

interface InlineOptions {
    enabled: boolean;
    maxFileSize: number;
}

interface SVGOpts extends MarkdownItPluginOpts {
    notFoundCb: (s: string) => void;
    imageOpts: ImageOptions;
    svgInline: InlineOptions;
}

function getSvgContent(file: string, from: string, {rawContent, notFoundCb, log, root = ''}: Opts) {
    try {
        return rawContent(file);
    } catch {
        const path = file.replace(root, '');
        // Normalize path separators to forward slashes for cross-platform compatibility
        const normalizedPath = path.replace(/\\/g, '/');
        log.error(`SVG ${normalizedPath} from ${from} not found`);

        if (notFoundCb) {
            notFoundCb(normalizedPath);
        }

        return null;
    }
}

type Opts = SVGOpts &
    ImageOpts & {
        rawContent: (path: string) => string;
        calcPath: (root: string, path: string) => string;
        replaceImageSrc: (
            state: StateCore,
            currentPath: string,
            path: string,
            imgSrc: string,
            opts: ImageOpts,
        ) => string;
        file: string;
    };

function shouldBeInlined(token: Token, opts: InlineOptions) {
    if (!token.attrGet('src')?.endsWith('.svg')) {
        return false;
    }

    const forceInlineSvg = token.attrGet('inline') === 'true';
    const shouldInlineSvg =
        forceInlineSvg || (token.attrGet('inline') !== 'false' && opts.enabled !== false);

    return shouldInlineSvg;
}

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
                if (isExternalHref(imgSrc)) {
                    return;
                }

                const forceInlineSvg = image.attrGet('inline') === 'true';
                const shouldInlineSvg = shouldBeInlined(image, opts.svgInline);
                const imageOpts = {
                    width: image.attrGet('width'),
                    height: image.attrGet('height'),
                };

                const from = state.env.path || opts.path;
                const file = calcPath(from, imgSrc);

                if (shouldInlineSvg) {
                    const svgContent = getSvgContent(file, from, {
                        ...opts,
                        rawContent,
                    });
                    if (svgContent) {
                        if (svgContent.length > opts.svgInline.maxFileSize && !forceInlineSvg) {
                            image.attrSet(
                                'YFM011',
                                `Svg size: ${svgContent.length}; Config size: ${opts.svgInline.maxFileSize}; Src: ${bold(file)}`,
                            );
                        } else {
                            const svgToken = new state.Token('image_svg', '', 0);
                            svgToken.attrSet('content', replaceSvgContent(svgContent, imageOpts));
                            childrenTokens[index] = svgToken;
                        }
                    }
                }

                if (childrenTokens[index].type === 'image') {
                    image.attrSet('src', replaceImage(state, from, file, imgSrc, opts));
                    image.attrSet('yfm_patched', '1');
                }
            });
        });
    };

    try {
        md.core.ruler.before('includes', 'images', plugin);
    } catch {
        md.core.ruler.push('images', plugin);
    }

    md.renderer.rules.image_svg = (tokens, index) => {
        const token = tokens[index];

        return token.attrGet('content') || '';
    };
};

function replaceSvgContent(content: string | null, options: ImageOptions) {
    if (!content) {
        return '';
    }
    // monoline
    content = content.replace(/>\r?\n</g, '><').replace(/\r?\n/g, ' ');

    // remove <?xml...?>
    content = content.replace(/<\?xml.*?\?>.*?(<svg.*)/g, '$1');

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
