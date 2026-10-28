import type {IDGenerator} from '@diplodoc/utils';
import type {LogConsumer} from './log-core';
import type {CompatibilityPolicy} from './deprecation-core';
import type {Highlighter} from './highlighter';
import type {Lang} from './shared-types';

/** Parser settings shared by the existing Node and browser execution hosts. */
export interface CoreParserOptions {
    /** Forward plugin messages while retaining the collected Transform diagnostics. */
    log?: LogConsumer;
    /** Explicit per-feature migration choices; unspecified features use their current contract. */
    compatibility?: CompatibilityPolicy;
    extractTitle?: boolean;
    needTitle?: boolean;
    allowHTML?: boolean;
    linkify?: boolean;
    linkifyTlds?: string | string[];
    breaks?: boolean;
    leftDelimiter?: string;
    rightDelimiter?: string;
    needFlatListHeadings?: boolean;
    disableRules?: string[];
    renderInline?: boolean;
    lang?: Lang;
    /** Explicit synchronous code highlighter; omitted means escaped plain code. */
    highlighter?: Highlighter;
    /** Enable general Markdown attributes explicitly; disabled by default. */
    enableMarkdownAttrs?: boolean;
    /**
     * Custom ID generator to use for this parser.
     * If provided, this exact function is used for IDs and retains its caller-owned state.
     * If not provided, Transform uses its default random ID generator.
     *
     * Parser reuse does not reset or clone a supplied generator.
     */
    generateID?: IDGenerator;
}
