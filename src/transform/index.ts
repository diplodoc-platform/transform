import type Token from 'markdown-it/lib/token';
import type {EnvType, OptionsType, OutputType} from './typings';

import {bold} from 'chalk';

import {log} from './log';
import liquidDocument from './liquid';
import initMarkdownIt from './md';

function applyLiquid(input: string, options: OptionsType) {
    const {
        vars = {},
        path,
        conditionsInCode = false,
        disableLiquid = false,
        isLiquided = false,
    } = options;

    return disableLiquid || isLiquided
        ? input
        : liquidDocument(input, vars, path, {conditionsInCode});
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
    const input = applyLiquid(originInput, options);
    const {parse, compile, env} = initMarkdownIt(options);

    try {
        const tokens = parse(input);
        // drawTokens(tokens)
        if (options.tokens === true) {
            return tokens;
        }
        return emitResult(compile(tokens), env);
    } catch (error) {
        handleError(error, options.path);
    }
}

// function drawTokens(tokens: Token[]) {
//     tokens.forEach((token) => {
//         const spase = '     '.repeat(token.level);
//         console.log(`${spase}`, token);
//     });
// }

export = transform;

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-redeclare -- backward compatibility
namespace transform {
    export type Options = OptionsType;
    export type Output = OutputType;
}
