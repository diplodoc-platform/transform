import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};
import type {IDGenerator} from '@diplodoc/utils';
import type {DeprecationReporter} from '../deprecation-core';
import type {DirectiveSyntax} from '../plugin-settings';

import {transform} from '@diplodoc/tabs-extension';

import {directiveMode, reportDirectiveDiagnostic, unwrapBuiltin} from '../builtin-invocation';

const implementation = transform({
    bundle: false,
    features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}},
});

/**
 * @deprecated Use transform({bundle: false, features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}}}) from @diplodoc/tabs-extension. Removal: 6.0.0.
 * @param md - Parser to configure.
 * @param options - Existing plugin context.
 * @returns Nothing.
 */
const tabs: (
    md: MarkdownIt,
    options?: {
        output?: string;
        generateID?: IDGenerator;
        path?: string;
        deprecations?: DeprecationReporter;
        directiveSyntax?: DirectiveSyntax;
        log?: {warn(message: string): void};
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
    const mode = directiveMode(invocation.options?.directiveSyntax, invocation.automatic);
    if (mode === 'disabled') {
        implementation(md, invocation.options);
    } else {
        transform({
            bundle: false,
            directiveSyntax: mode,
            features: {
                enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true},
            },
            onDiagnostic: (item) => reportDirectiveDiagnostic(md, invocation.options, 'tabs', item),
        })(md, invocation.options);
    }
};
Object.defineProperties(tabs, Object.getOwnPropertyDescriptors(implementation));

export default tabs;
