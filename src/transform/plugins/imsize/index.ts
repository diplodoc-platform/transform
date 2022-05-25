import {PluginSimple} from 'markdown-it';
import {imageWithSize} from './plugin';

/**
 * Imsize plugin for markdown-it.
 * This plugin overloads original image renderer.
 * Forked from https://github.com/tatsy/markdown-it-imsize
 */

const imsize: PluginSimple = (md) => {
    md.inline.ruler.before('emphasis', 'image', imageWithSize(md));
};

export = imsize;
