import type {DeprecationReporter} from './deprecation';
import type {OptionsType} from './typings';
import type {Logger} from './log-core';
import type {ParserHost} from './parser-core';

import {createParser} from './parser-core';
import DefaultPlugins from './plugins';
import cut from './plugins/cut';
import tabs from './plugins/tabs';
import notes from './plugins/notes';
import {preprocess} from './preprocessors';
import {createDocumentLogger} from './diagnostic-context';
import {getLogger, log} from './log';
import {createDeprecationReporter} from './deprecation';
import {resolvePluginConfiguration} from './plugin-registry';
import {defaultOptions} from './sanitize-core';
import {sanitizersForLogger} from './sanitize-node';

const nodeHost: ParserHost = {
    defaultPlugins: DefaultPlugins,
    deprecatedBuiltinAdapters: {cut, tabs, notes},
    resolvePlugins: resolvePluginConfiguration,
    preprocess,
    getLogger,
    createLogger: createDocumentLogger,
    createReporter: createDeprecationReporter,
    sanitize(html, options, additional, logger, custom) {
        const {sanitize, sanitizeStyles} = sanitizersForLogger(logger ?? log);
        if (!custom) {
            return sanitize(html, options, additional);
        }
        if (options?.disableStyleSanitizer) {
            return custom(html, options);
        }

        // Node callbacks receive style-sanitized HTML unless explicitly disabled.
        const base = options || defaultOptions;
        const filtered = sanitizeStyles(html, {
            ...base,
            cssWhiteList: {
                ...defaultOptions.cssWhiteList,
                ...base.cssWhiteList,
                ...additional?.cssWhiteList,
            },
        });
        return custom(filtered, options);
    },
};

function initMarkdownIt(
    options: OptionsType,
    firstDocumentReporter?: DeprecationReporter,
    firstDocumentLogger?: Logger,
) {
    return createParser(options, nodeHost, firstDocumentReporter, firstDocumentLogger);
}

export default initMarkdownIt;
