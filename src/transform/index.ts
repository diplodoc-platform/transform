import type {EnvType, OptionsType, OutputType} from './typings';
import {bold} from 'chalk';
import {log} from './log';
import liquid from './liquid';
import initMarkdownit from './md';

function applyLiquid(input: string, options: OptionsType) {
    const {
        vars = {},
        path,
        conditionsInCode = false,
        disableLiquid = false,
        isLiquided = false,
    } = options;

    return disableLiquid || isLiquided ? input : liquid(input, vars, path, {conditionsInCode});
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

// eslint-disable-next-line consistent-return
function transform(originInput: string, options: OptionsType = {}) {
    const input = applyLiquid(originInput, options);
    const {parse, compile, env} = initMarkdownit(options);

    try {
        return emitResult(compile(parse(input)), env);
    } catch (error) {
        handleError(error, options.path);
    }
}

export = transform;

// eslint-disable-next-line @typescript-eslint/no-namespace, no-redeclare -- backward compatibility
namespace transform {
    export type Options = OptionsType;
    export type Output = OutputType;
}
