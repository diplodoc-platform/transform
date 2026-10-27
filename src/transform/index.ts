import type {DeprecationReporter} from './deprecation';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {EnvType, OptionsType, OutputType} from './typings';
import type {
    ContentAudience as VisibilityContentAudience,
    VisibilityMode as VisibilityContentMode,
} from './plugins/visibility';

import {bold} from 'chalk';

import {log} from './log';
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
        : liquidDocument(input, vars, path, {conditionsInCode, deprecations});
}

function handleError(error: unknown, path?: string): never {
    log.error(`Error occurred${path ? ` in ${bold(path)}` : ''}`);

    throw error;
}

function emitResult(html: string, env: EnvType): OutputType {
    return {
        result: {...env, html},
        logs: log.get(),
    };
}

type TokensOptionsType = OptionsType & {tokens: true};

function transform(originInput: string, options: TokensOptionsType): Token[];
function transform(originInput: string, options?: OptionsType): OutputType;
function transform(originInput: string, options: OptionsType = {}): OutputType | Token[] {
    const deprecations = createDeprecationReporter(options);
    const input = applyLiquid(originInput, options, deprecations);
    const {parse, compile, env} = initMarkdownIt(options, deprecations);

    try {
        const tokens = parse(input);
        if (options.tokens === true) {
            return tokens;
        }
        return emitResult(compile(tokens), env);
    } catch (error) {
        handleError(error, options.path);
    }
}

export {transform};
export default transform;

const transformImplementation = transform;

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-redeclare -- backward compatibility
namespace transform {
    export const transform = transformImplementation;
    export type Options = OptionsType;
    export type Output = OutputType;
    export type ContentAudience = VisibilityContentAudience;
    export type VisibilityMode = VisibilityContentMode;
}
