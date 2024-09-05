import type {PluginWithOptions} from 'markdown-it';

import {CheckboxOptions, checkboxReplace} from './checkbox';

/**
 * Checkbox plugin for markdown-it.
 * Forked from https://github.com/mcecot/markdown-it-checkbox
 */

const checkbox: PluginWithOptions<CheckboxOptions> = (md, options) => {
    md.core.ruler.push('checkbox', checkboxReplace(md, options));

    return md;
};

export = checkbox;
