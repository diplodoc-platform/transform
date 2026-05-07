import type {LandingSerializationResult, OptionsType} from './typings';

import {createTransformRuntime} from './runtime';

export function serializeLanding(
    originInput: string,
    options: OptionsType = {},
): LandingSerializationResult {
    const runtime = createTransformRuntime(originInput, options);

    return {
        kind: 'landing',
        title: runtime.env.title,
        headings: runtime.env.headings,
        meta: runtime.env.meta,
        assets: runtime.env.assets,
        tokens: runtime.tokens,
    };
}
