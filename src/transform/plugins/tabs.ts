import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};
import type {IDGenerator} from '@diplodoc/utils';
import type {DeprecationReporter} from '../deprecation-core';

import {transform} from '@diplodoc/tabs-extension';

import {unwrapBuiltin} from '../builtin-invocation';

const implementation = transform({
    bundle: false,
    features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}},
});

/** @deprecated Use transform({bundle: false, features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}}}) from @diplodoc/tabs-extension. Removal: 6.0.0. */
const tabs: (
    md: MarkdownIt,
    options?: {
        output?: string;
        generateID?: IDGenerator;
        path?: string;
        deprecations?: DeprecationReporter;
    },
) => void = (md, options) => {
    const invocation = unwrapBuiltin(options, tabs);
    if (!invocation.automatic) {
        const context = invocation.options;
        context?.deprecations?.warn(
            {
                code: 'LEGACY_TABS_CALLBACK',
                feature: 'Transform tabs callback',
                replacement:
                    'transform({bundle: false, features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}}}) from @diplodoc/tabs-extension',
                removal: {version: '6.0.0'},
            },
            {option: 'plugins.tabs', ...(context.path ? {location: {path: context.path}} : {})},
        );
    }
    implementation(md, invocation.options);
};
Object.defineProperties(tabs, Object.getOwnPropertyDescriptors(implementation));

export default tabs;
