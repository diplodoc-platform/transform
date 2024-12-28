import type {EnvType, OptionsType, OutputType, RootCollectorOptions} from './typings';

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

type TransformFunction = {
    (originInput: string, options?: OptionsType): OutputType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collect: (input: string, options: RootCollectorOptions<any>) => string;
};

// eslint-disable-next-line consistent-return
const transform: TransformFunction = (originInput: string, options: OptionsType = {}) => {
    const input = applyLiquid(originInput, options);
    const {parse, compile, env} = initMarkdownIt(options);

    try {
        return emitResult(compile(parse(input)), env);
    } catch (error) {
        handleError(error, options.path);
    }
};

transform.collect = (
    input: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {mdItInitOptions, pluginCollectOptions, parserPluginsOverride}: RootCollectorOptions<any>,
) => {
    const maybeLiquidedInput = applyLiquid(input, mdItInitOptions);
    const {parse} = initMarkdownIt({
        ...mdItInitOptions,
        plugins: parserPluginsOverride ?? mdItInitOptions.plugins,
    });

    const plugins = mdItInitOptions.plugins ?? [];

    try {
        const tokenStream = parse(maybeLiquidedInput);

        return plugins.reduce((collected, plugin) => {
            const collectOutput = plugin.collect?.(collected, {
                ...pluginCollectOptions,
                tokenStream,
            });

            return collectOutput ?? collected;
        }, maybeLiquidedInput);
    } catch (error) {
        handleError(error, mdItInitOptions.path);
    }
};

export = transform;

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-redeclare -- backward compatibility
namespace transform {
    export type Options = OptionsType;
    export type Output = OutputType;
}
