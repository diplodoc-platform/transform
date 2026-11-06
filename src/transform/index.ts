import type {DeprecationReporter} from './deprecation';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {EnvType, OptionsType, OutputType} from './typings';
import type {
    ContentAudience as VisibilityContentAudience,
    VisibilityMode as VisibilityContentMode,
} from './plugins/visibility';
import type {Logger} from './log-core';

import {bold} from 'chalk';

import {createDocumentLogger} from './diagnostic-context';
import {createDeprecationReporter} from './deprecation';
import liquidDocument from './liquid';
import initMarkdownIt from './md';

function applyLiquid(input: string, options: OptionsType, deprecations: DeprecationReporter) {
    const {
        vars = {},
        path,
        conditionsInCode = false,
        disableLiquid = false,
        isLiquided = false,
    } = options;

    return disableLiquid || isLiquided
        ? input
        : liquidDocument(input, vars, path, {
              conditionsInCode,
              deprecations,
              log: options.log,
              deprecationWarnings: options.deprecationWarnings,
          });
}

function handleError(error: unknown, logger: Logger, path?: string): never {
    logger.error(`Error occurred${path ? ` in ${bold(path)}` : ''}`);

    throw error;
}

function emitResult(html: string, env: EnvType, logger: Logger): OutputType {
    return {
        result: {...env, html},
        logs: logger.get(),
    };
}

type TokensOptionsType = OptionsType & {tokens: true};

function transform(originInput: string, options: TokensOptionsType): Token[];
function transform(originInput: string, options?: OptionsType): OutputType;
function transform(originInput: string, options: OptionsType = {}): OutputType | Token[] {
    const logger = createDocumentLogger(options);
    const scopedOptions = {...options, log: logger};
    const deprecations = createDeprecationReporter(scopedOptions);
    try {
        const input = applyLiquid(originInput, scopedOptions, deprecations);
        const {parseDocument, compileDocument} = initMarkdownIt(options, deprecations, logger);
        const document = parseDocument(input);
        if (options.tokens === true) return document.tokens;
        return emitResult(compileDocument(document), document.env, logger);
    } catch (error) {
        handleError(error, logger, options.path);
    }
}

export {transform};
export default transform;
export type {OptionsType as Options, OutputType as Output} from './typings';
export type {ContentAudience, VisibilityMode} from './plugins/visibility';

const transformImplementation = transform;

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-redeclare -- backward compatibility
namespace transform {
    export const transform = transformImplementation;
    export type Options = OptionsType;
    export type Output = OutputType;
    export type ContentAudience = VisibilityContentAudience;
    export type VisibilityMode = VisibilityContentMode;
}
