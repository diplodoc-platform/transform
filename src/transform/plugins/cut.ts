import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};

import {transform} from '@diplodoc/cut-extension';

const cut: (md: MarkdownIt, options?: {output?: string}) => void = transform({
    bundle: false,
    directiveSyntax: 'disabled',
});

export = cut;
