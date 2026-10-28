import css from 'css';

import log from './log';
import {createSanitizer} from './sanitize-core';

export {defaultOptions, defaultParseOptions} from './sanitize-core';
export type {SanitizeFunction, SanitizeOptions} from './sanitize-core';

const {sanitize, sanitizeStyles} = createSanitizer(css, log);

export {sanitize, sanitizeStyles};
export default sanitize;
