import type {CssAdapter} from '../sanitize-core';

import parse from 'css/lib/parse/index.js';
import Compiler from 'css/lib/stringify/identity.js';

/** Real CSS parsing/serialization without optional source-map filesystem services. */
export const browserCss: CssAdapter = {
    parse,
    stringify: (stylesheet) => new Compiler().compile(stylesheet),
};
