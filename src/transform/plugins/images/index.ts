import {join, sep} from 'path';
import {bold} from 'chalk';
import {optimize} from 'svgo';
import Token from 'markdown-it/lib/token';
import {readFileSync} from 'fs';

import {isFileExists, resolveRelativePath} from '../../utilsFS';
import {isExternalHref, isLocalUrl} from '../../utils';
import {MarkdownItPluginCb, MarkdownItPluginOpts} from '../typings';
import {StateCore} from '../../typings';

interface ImageOpts extends MarkdownItPluginOpts {
    assetsPublicPath: string;
    inlineSvg?: boolean;
}

function replaceImageSrc(
    token: Token,
    state: StateCore,
    {assetsPublicPath = sep, root = '', path: optsPath, log}: ImageOpts,
) {
    const src = token.attrGet('src') || '';
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
}

function prefix() {
    const value = Math.floor(Math.random() * 1e9);

    return value.toString(16);
}

function convertSvg(
    token: Token,
    state: StateCore,
    {path: optsPath, log, notFoundCb, root}: SVGOpts,
) {
    const currentPath = state.env.path || optsPath;
    const path = resolveRelativePath(currentPath, token.attrGet('src') || '');

    try {
        const raw = readFileSync(path).toString();
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
    md.assets = [];

    md.inline.ruler.after('image', 'image_caption', (state, silent) => {
        const pos = state.pos;
        const max = state.posMax;

        if (state.tokens.length === 0 || state.tokens[state.tokens.length - 1].type !== 'image') {
            return false;
        }
        if (state.src.charCodeAt(pos) !== 0x7b /* { */) {
            return false;
        }

        let found = false;
        let curPos = pos + 1;
        let captionText = '';

        while (curPos < max) {
            if (state.src.charCodeAt(curPos) === 0x7d /* } */) {
                const content = state.src.slice(pos + 1, curPos).trim();
                const captionMatch = content.match(/^caption(?:="([^"]*)")?$/);
                if (captionMatch) {
                    found = true;
                    captionText = captionMatch[1] || '';
                    break;
                }
            }
            curPos++;
        }

        if (!found) {
            return false;
        }

        if (!silent) {
            const token = state.tokens[state.tokens.length - 1];
            token.type = 'image_with_caption';
            if (captionText) {
                token.attrSet('caption', captionText);
            }
            state.pos = curPos + 1;
            return true;
        }

        state.pos = curPos + 1;
        return true;
    });

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
                if (
                    childrenTokens[j].type === 'image' ||
                    childrenTokens[j].type === 'image_with_caption'
                ) {
                    const didPatch = childrenTokens[j].attrGet('yfm_patched') || false;

                    if (didPatch) {
                        j++;
                        continue;
                    }

                    const imgSrc = childrenTokens[j].attrGet('src') || '';
                    const shouldInlineSvg = opts.inlineSvg !== false && !isExternalHref(imgSrc);

                    if (imgSrc.endsWith('.svg') && shouldInlineSvg) {
                        childrenTokens[j] = convertSvg(childrenTokens[j], state, opts);
                    } else {
                        replaceImageSrc(childrenTokens[j], state, opts);
                    }

                    childrenTokens[j].attrSet('yfm_patched', '1');
                }
                j++;
            }

            j = 0;
            const newTokens: Token[] = [];

            while (j < childrenTokens.length) {
                if (childrenTokens[j].type === 'image_with_caption') {
                    const explicitCaption = childrenTokens[j].attrGet('caption');
                    const title = childrenTokens[j].attrGet('title');
                    const captionText = explicitCaption || title || '';

                    const figureOpen = new state.Token('figure_open', 'figure', 1);
                    const figureClose = new state.Token('figure_close', 'figure', -1);

                    childrenTokens[j].type = 'image';

                    if (captionText) {
                        const captionOpen = new state.Token('figcaption_open', 'figcaption', 1);
                        const captionContent = new state.Token('text', '', 0);
                        captionContent.content = captionText;
                        const captionClose = new state.Token('figcaption_close', 'figcaption', -1);

                        newTokens.push(
                            figureOpen,
                            childrenTokens[j],
                            captionOpen,
                            captionContent,
                            captionClose,
                            figureClose,
                        );
                    } else {
                        newTokens.push(figureOpen, childrenTokens[j], figureClose);
                    }
                } else {
                    newTokens.push(childrenTokens[j]);
                }
                j++;
            }

            tokens[i].children = newTokens;
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

    md.renderer.rules.figure_open = () => '<figure>';
    md.renderer.rules.figure_close = () => '</figure>';
    md.renderer.rules.figcaption_open = () => '<figcaption>';
    md.renderer.rules.figcaption_close = () => '</figcaption>';
};

export = index;
