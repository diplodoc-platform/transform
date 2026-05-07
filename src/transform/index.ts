import type Token from 'markdown-it/lib/token';
import type {
    EnvType,
    OptionsType,
    OutputType,
    LandingSerializationResult as LandingSerializationResultType,
} from './typings';
import type {TransformRuntime as RuntimeType} from './runtime';
import type {
    PageConstructorSerializationResult as PageConstructorSerializationResultType,
    SerializePageConstructorOptions as SerializePageConstructorOptionsType,
} from './page-constructor';

import {log} from './log';
import {createTransformRuntime} from './runtime';
import {serializeLanding as serializeLandingImpl} from './serialize';
import {serializePageConstructor as serializePageConstructorImpl} from './page-constructor';

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
    const runtime = createTransformRuntime(originInput, options);

    if (options.tokens === true) {
        return runtime.tokens;
    }

    return emitResult(runtime.compile(), runtime.env);
}

namespace transform {
    export type Options = OptionsType;
    export type Output = OutputType;
    export const createRuntime = createTransformRuntime;
    export const serializeLanding = serializeLandingImpl;
    export const serializePageConstructor = serializePageConstructorImpl;
    export type TransformRuntime = RuntimeType;
    export type LandingSerializationResult = LandingSerializationResultType;
    export type PageConstructorSerializationResult = PageConstructorSerializationResultType;
    export type SerializePageConstructorOptions = SerializePageConstructorOptionsType;
}

export = transform;
