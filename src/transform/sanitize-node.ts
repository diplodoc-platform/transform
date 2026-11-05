import type {Logger} from './log-core';

import css from 'css';

import {createSanitizer} from './sanitize-core';

/**
 * Bind the Node CSS adapter to an explicitly selected diagnostic sink.
 * @param logger - Selected document or explicit compatibility sink.
 * @returns The unchanged sanitizer policy bound to that sink.
 */
export function sanitizersForLogger(logger: Logger) {
    return createSanitizer(css, logger);
}
