import type Token from 'markdown-it/lib/token';
import type {EnvType, MarkdownIt, OptionsType} from './typings';

import {bold} from 'chalk';

import {log} from './log';
import liquidDocument from './liquid';
import initMarkdownIt from './md';

export interface TransformRuntime {
    input: string;
    env: EnvType;
    md: MarkdownIt;
    tokens: Token[];
    compile(): string;
}

export function applyLiquid(input: string, options: OptionsType) {
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

export function handleTransformError(error: unknown, path?: string): never {
    log.error(`Error occurred${path ? ` in ${bold(path)}` : ''}`);

    throw error;
}

export function createTransformRuntime(
    originInput: string,
    options: OptionsType = {},
): TransformRuntime {
    const input = applyLiquid(originInput, options);
    const {parse, compile, env, md} = initMarkdownIt(options);

    try {
        const tokens = parse(input);

        return {
            input,
            env,
            md,
            tokens,
            compile() {
                return compile(tokens);
            },
        };
    } catch (error) {
        return handleTransformError(error, options.path);
    }
}
