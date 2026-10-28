import type {MarkdownIt} from '../typings';

import sub from 'markdown-it-sub';

// Install the pinned plain-text subscript grammar without changing strikethrough.
export default function subscript(md: MarkdownIt) {
    sub(md);
}
