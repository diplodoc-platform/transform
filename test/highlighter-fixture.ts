import hljs from 'highlight.js';

import {createHighlightJsHighlighter} from '../src/transform/highlighter';

/** Explicit full-language fixture for tests that assert highlighted legacy HTML. */
export const highlighter = createHighlightJsHighlighter(hljs);
