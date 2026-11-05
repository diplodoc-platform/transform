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
import {sanitizersForLogger} from './sanitize-node';

const nodeHost: ParserHost = {
    defaultPlugins: DefaultPlugins,
    deprecatedBuiltinAdapters: {cut, tabs, notes},
    resolvePlugins: resolvePluginConfiguration,
    preprocess,
    getLogger,
    createLogger: createDocumentLogger,
    createReporter: createDeprecationReporter,
    sanitize: (html, options, additional, logger) =>
        sanitizersForLogger(logger ?? log).sanitize(html, options, additional),
    sanitizeStyles: (html, options, logger) =>
        sanitizersForLogger(logger ?? log).sanitizeStyles(html, options),
};

function initMarkdownIt(
    options: OptionsType,
    firstDocumentReporter?: DeprecationReporter,
    firstDocumentLogger?: Logger,
) {
    return createParser(options, nodeHost, firstDocumentReporter, firstDocumentLogger);
}

export default initMarkdownIt;
