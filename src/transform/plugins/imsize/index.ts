import {PluginWithOptions} from 'markdown-it';

import {ImsizeOptions, imageWithSize} from './plugin';

/**
 * Imsize plugin for markdown-it.
 * This plugin overloads original image renderer.
 * Forked from https://github.com/tatsy/markdown-it-imsize
 */

const imsize: PluginWithOptions<ImsizeOptions> = (md, opts) => {
    md.inline.ruler.before('emphasis', 'image', imageWithSize(md, opts));
};

export = imsize;
