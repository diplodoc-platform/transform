import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};

// @ts-expect-error
import sup from 'markdown-it-sup';

export default sup as (md: MarkdownIt) => void;
