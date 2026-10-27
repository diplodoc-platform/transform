import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};
import type {ImsizeOptions} from './plugin';

import {imageWithSize} from './plugin';

/**
 * Imsize plugin for markdown-it.
 * This plugin overloads original image renderer.
 * Forked from https://github.com/tatsy/markdown-it-imsize
 */

const imsize = (md: MarkdownIt, opts?: ImsizeOptions) => {
    md.inline.ruler.before('emphasis', 'image', imageWithSize(md, opts));
};

export default imsize;
