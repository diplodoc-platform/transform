import type {PluginWithOptions} from 'markdown-it';
import {FILE_TOKEN, RULE_NAME} from './const';
import {FileOptions, fileParser, fileRenderer} from './file';

const filePlugin: PluginWithOptions<FileOptions> = (md, opts) => {
    md.inline.ruler.push(RULE_NAME, fileParser(md, opts));
    md.renderer.rules[FILE_TOKEN] = fileRenderer(md);
};

export = filePlugin;
