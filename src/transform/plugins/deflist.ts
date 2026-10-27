import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};

// @ts-expect-error
import deflist from 'markdown-it-deflist';

export = deflist as (md: MarkdownIt) => void;
