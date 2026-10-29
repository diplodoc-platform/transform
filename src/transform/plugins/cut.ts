import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};
import type {DeprecationReporter} from '../deprecation-core';

import {transform} from '@diplodoc/cut-extension';

import {unwrapBuiltin} from '../builtin-invocation';

const implementation = transform({bundle: false, directiveSyntax: 'disabled'});

type AdapterOptions = {output?: string; path?: string; deprecations?: DeprecationReporter};
type CutCollector = {collect(input: string, options: {destRoot: string}): void};

const cutCallback = (md: MarkdownIt, options?: AdapterOptions) => {
    const invocation = unwrapBuiltin(options, cutCallback);
    if (!invocation.automatic) {
        const context = invocation.options;
        context?.deprecations?.warn(
            {
                code: 'LEGACY_CUT_CALLBACK',
                feature: 'Transform cut callback',
                replacement:
                    "transform({bundle: false, directiveSyntax: 'disabled'}) from @diplodoc/cut-extension",
                removal: {version: '6.0.0'},
            },
            {option: 'plugins.cut', ...(context.path ? {location: {path: context.path}} : {})},
        );
    }
    implementation(md, invocation.options);
};

/** @deprecated Use transform({bundle: false, directiveSyntax: 'disabled'}) from @diplodoc/cut-extension. Removal: 6.0.0. */
const cut = Object.defineProperties(
    cutCallback,
    Object.getOwnPropertyDescriptors(implementation),
) as typeof cutCallback & CutCollector;

export default cut;
