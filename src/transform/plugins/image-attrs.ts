/* eslint-disable valid-jsdoc */
import MarkdownIt from 'markdown-it';
import {parseMdAttrs} from '@diplodoc/utils';

import {applyInlineStyling} from './imsize/inline-styles';

export type ImageAttributesPluginOptions = {
    enableInlineStyling?: boolean;
    /**
     * Additional allowed attributes
     *
     * Attributes `width` and `height` always allowed
     */
    allowedAttributes?: string[];
};

const defaultAllowedAttrs = ['width', 'height'] as const;

/**
 * Plugin for parsing image node attributes.
 *
 * Example of markup:
 *
 * ```md
 * ![alt](_images/image.png "title"){width=100 height=100}
 * ```
 */
export const imageAttrsPlugin: MarkdownIt.PluginWithOptions<ImageAttributesPluginOptions> = (
    md,
    opts = {},
) => {
    const allowedAttrs = new Set<string>(defaultAllowedAttrs);
    if (Array.isArray(opts.allowedAttributes)) {
        for (const val of opts.allowedAttributes) {
            allowedAttrs.add(val);
        }
    }

    md.core.ruler.push('image-attributes', (state) => {
        for (const token of state.tokens) {
            if (token.type !== 'inline') {
                continue;
            }

            const children = token.children || [];
            for (let i = 0; i < children.length; i++) {
                const imgToken = children[i];
                if (imgToken.type !== 'image') {
                    continue;
                }

                const nextTextToken = children[i + 1];
                if (nextTextToken?.type !== 'text') {
                    continue;
                }

                const res = parseMdAttrs(
                    md,
                    nextTextToken.content,
                    0,
                    nextTextToken.content.length,
                );
                if (!res) {
                    continue;
                }

                nextTextToken.content = nextTextToken.content.slice(res.pos);

                for (const key of allowedAttrs) {
                    if (res.attrs[key]) {
                        if (key === 'class') {
                            const values = res.attrs[key];
                            values.forEach((val) => imgToken.attrJoin(key, val));
                        } else {
                            const value = res.attrs[key][0];
                            imgToken.attrSet(key, value);
                        }
                    }
                }

                if (opts.enableInlineStyling) {
                    applyInlineStyling(imgToken, state.env);
                }
            }
        }
    });
};
