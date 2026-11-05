import log from './log';
import {sanitizersForLogger} from './sanitize-node';

export {defaultOptions, defaultParseOptions} from './sanitize-core';
export type {SanitizeFunction, SanitizeOptions} from './sanitize-core';

const {sanitize, sanitizeStyles} = sanitizersForLogger(log);

export {sanitize, sanitizeStyles};
export default sanitize;
