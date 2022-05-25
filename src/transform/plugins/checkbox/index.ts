import MarkdownIt from 'markdown-it';
import {CheckboxOptions, checkboxReplace} from './checkbox';

/**
 * Checkbox plugin for markdown-it.
 * Forked from https://github.com/mcecot/markdown-it-checkbox
 */

const checkbox = (md: MarkdownIt, options: CheckboxOptions) => {
    md.core.ruler.push('checkbox', checkboxReplace(md, options));

    return md;
};

export = checkbox;
