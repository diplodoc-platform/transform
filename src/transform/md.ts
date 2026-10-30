import type {DeprecationReporter} from './deprecation';
import type {OptionsType} from './typings';
import type {ParserHost} from './parser-core';

import {createParser} from './parser-core';
import DefaultPlugins from './plugins';
import cut from './plugins/cut';
import tabs from './plugins/tabs';
import notes from './plugins/notes';
import {preprocess} from './preprocessors';
import {getLogger} from './log';
import {createDeprecationReporter} from './deprecation';
import {resolvePluginConfiguration} from './plugin-registry';
import sanitize, {sanitizeStyles} from './sanitize';

const nodeHost: ParserHost = {
    defaultPlugins: DefaultPlugins,
    deprecatedBuiltinAdapters: {cut, tabs, notes},
    resolvePlugins: resolvePluginConfiguration,
    preprocess,
    getLogger,
    createReporter: createDeprecationReporter,
    sanitize,
    sanitizeStyles,
};

function initMarkdownIt(options: OptionsType, firstDocumentReporter?: DeprecationReporter) {
    return createParser(options, nodeHost, firstDocumentReporter);
}

export default initMarkdownIt;
