import type {PluginOptions} from '@diplodoc/file-extension';
import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};

import {transform} from '@diplodoc/file-extension';

const file: (md: MarkdownIt, options?: PluginOptions) => void = transform({
    bundle: false,
    directiveSyntax: 'disabled',
});

export = file;
