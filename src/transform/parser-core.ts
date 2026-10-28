import type {DeprecationReporter} from './deprecation';
import type {EnvType, MarkdownIt, MarkdownItPluginOpts, OptionsType} from './typings';
import type {DocumentEnv, DocumentParser, ParsedDocument} from './document';
import type {LogConsumer, Logger} from './log-core';
import type {PluginInstallation} from './plugin-configuration';
import type {SanitizeFunction, SanitizeOptions} from './sanitize-core';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};

import DefaultMarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import {createIDGeneratorByStrategy} from '@diplodoc/utils';

import {createDocumentEnv} from './document-data';
import {
    createLegacyEnvView,
    installDocumentContext,
    normalizeDocumentResources,
    resetPendingDocument,
    withDocumentEnv,
} from './document-context-core';
import {normalizeSvgInline} from './plugins/images/options';
import {configureHighlighter} from './highlighter/renderer';
import extractTitle from './title';
import getHeadings from './headings';
import {defaultOptions} from './sanitize-core';
import {resolveMarkdownAttrs} from './parser-policy';
import {olAttrConversion} from './plugins/ol-attr-conversion';
import linkifyStrikethrough from './plugins/linkify-strikethrough';
import inlineSvgMarker from './plugins/inline-svg-marker';
import {DEFAULT_LANG} from './constants';

/** Finite execution-host operations; parser state and lifecycle remain shared. */
export interface ParserHost {
    defaultPlugins: NonNullable<OptionsType['plugins']>;
    resolvePlugins(options: OptionsType): PluginInstallation[] | undefined;
    preprocess(
        input: string,
        pluginOptions: MarkdownItPluginOpts,
        options: Omit<OptionsType, 'log'> & {log: Logger},
        md: MarkdownIt,
    ): string;
    getLogger(consumer?: LogConsumer): Logger;
    createReporter(options: OptionsType): DeprecationReporter;
    sanitize: SanitizeFunction;
    sanitizeStyles(html: string, options: SanitizeOptions): string;
}

// The attrs 4.3 declarations omit the options supported by the pinned runtime.
const applyAttrs = attrs as (
    md: MarkdownIt,
    options: {leftDelimiter: string; rightDelimiter: string},
) => void;

/**
 * Create the shared synchronous parser with a finite execution host.
 * @param options - Existing Transform parser options.
 * @param host - Builtins, preprocessing, diagnostics and sanitization for this host.
 * @param firstDocumentReporter - Optional scope shared with root preprocessing.
 * @returns Parser with owned document handles and the legacy result view.
 */
export function createParser(
    options: OptionsType,
    host: ParserHost,
    firstDocumentReporter?: DeprecationReporter,
): DocumentParser {
    const {allowHTML = false, linkify = false, breaks = true, disableRules = []} = options;

    const setupReporter = host.createReporter(options);
    let activeReporter: DeprecationReporter | undefined;
    let completedReporter: DeprecationReporter | undefined;
    const reporter: DeprecationReporter = {
        warn: (descriptor, usage) =>
            (activeReporter ?? completedReporter ?? setupReporter).warn(descriptor, usage),
        reset: () => (activeReporter ?? completedReporter ?? setupReporter).reset(),
        compatibility: (code) =>
            (activeReporter ?? completedReporter ?? setupReporter).compatibility(code),
    };
    const pluginOptions = getPluginOptions(options, reporter, host);
    const highlight = configureHighlighter(options, pluginOptions.deprecations);
    const md = new DefaultMarkdownIt({html: allowHTML, linkify, highlight, breaks}) as MarkdownIt;

    // Keep Transform's established linkify behavior when using linkify-it 6.
    md.linkify.set({fuzzyLink: true, fuzzyEmail: true, urlAuth: true});

    if (disableRules?.length) {
        md.disable(disableRules);
    }

    const context = installDocumentContext(md, reporter);
    initPlugins(md, options, pluginOptions, host);

    let pending = true;
    let active: DocumentEnv | undefined;
    let last: DocumentEnv | undefined;
    const owned = new WeakMap<ParsedDocument, {reporter: DeprecationReporter; valid: boolean}>();
    const associated = new WeakMap<Token[], ParsedDocument>();
    const reporters = new WeakMap<DocumentEnv, DeprecationReporter>();
    const env = createLegacyEnvView(() => active ?? last ?? context.pending);

    function run<T>(documentEnv: DocumentEnv, scope: DeprecationReporter, action: () => T): T {
        if (active) {
            throw new Error(
                'Top-level document parsing or compilation cannot be reentered; use parseDocumentFragment for nested content',
            );
        }
        active = documentEnv;
        activeReporter = scope;
        const previousLast = context.last;
        try {
            const value = withDocumentEnv(md, documentEnv, action);
            normalizeDocumentResources(documentEnv);
            last = documentEnv;
            completedReporter = scope;
            return value;
        } catch (error) {
            context.last = previousLast;
            if (!last) {
                resetPendingDocument(md);
            }
            throw error;
        } finally {
            active = undefined;
            activeReporter = undefined;
        }
    }

    function parseDocument(input: string, initialize?: (env: DocumentEnv) => void): ParsedDocument {
        if (active) {
            throw new Error(
                'Top-level document parsing cannot be reentered; use parseDocumentFragment',
            );
        }
        const documentEnv = pending ? context.pending : createDocumentEnv();
        const scope =
            pending && firstDocumentReporter ? firstDocumentReporter : host.createReporter(options);
        pending = false;
        reporters.set(documentEnv, scope);
        return run(documentEnv, scope, () => {
            initialize?.(documentEnv);
            const tokens = initParser(md, options, documentEnv, pluginOptions, host)(input);
            const document = Object.freeze({tokens, env: documentEnv});
            owned.set(document, {reporter: scope, valid: true});
            associated.set(tokens, document);
            return document;
        });
    }

    function compile(tokens: Token[], explicit?: ParsedDocument): string {
        if (active) {
            throw new Error('Top-level document compilation cannot be reentered');
        }
        const document = explicit ?? associated.get(tokens);
        if (!document) {
            const documentEnv = last ?? context.pending;
            const scope = reporters.get(documentEnv) ?? setupReporter;
            return run(documentEnv, scope, () => {
                scope.warn(
                    {
                        code: 'UNASSOCIATED_DOCUMENT_TOKENS',
                        feature: 'Compiling tokens without their document context',
                        replacement: 'compile(tokens, document) or compileDocument(document)',
                        removal: {version: '6.0.0'},
                    },
                    {option: 'compile.tokens'},
                );
                return initCompiler(md, options, documentEnv, host)(tokens);
            });
        }
        const state = owned.get(document);
        if (!state || !state.valid) {
            throw new TypeError('Expected a valid document handle created by this parser');
        }
        try {
            return run(document.env, state.reporter, () =>
                initCompiler(md, options, document.env, host)(tokens),
            );
        } catch (error) {
            state.valid = false;
            throw error;
        }
    }

    return {
        parseDocument,
        compileDocument: (document) => compile(document.tokens, document),
        parse: (input) => parseDocument(input).tokens,
        compile,
        env,
    };
}

function getPluginOptions(
    options: OptionsType,
    deprecations: DeprecationReporter,
    host: ParserHost,
) {
    const {
        vars = {},
        path,
        extractTitle,
        conditionsInCode = false,
        disableLiquid = false,
        lang = DEFAULT_LANG,
        svgInline,
        inlineSvg,
        generateID,
        ...customOptions
    } = options;

    return {
        ...customOptions,
        conditionsInCode,
        vars,
        path,
        extractTitle,
        disableLiquid,
        log: host.getLogger(options.log),
        deprecations,
        lang,
        inlineSvg,
        svgInline: normalizeSvgInline({svgInline, inlineSvg}),
        generateID: generateID ?? createIDGeneratorByStrategy('random'),
    } as MarkdownItPluginOpts & {deprecations: DeprecationReporter};
}

function initPlugins(
    md: MarkdownIt,
    options: OptionsType,
    pluginOptions: MarkdownItPluginOpts,
    host: ParserHost,
) {
    const configuredPlugins = host.resolvePlugins(options);
    const {
        linkify = false,
        linkifyTlds,
        leftDelimiter = '{',
        rightDelimiter = '}',
        plugins = host.defaultPlugins,
        enableMarkdownAttrs,
    } = options;

    if (resolveMarkdownAttrs(enableMarkdownAttrs)) {
        // Need for ids of headers
        md.use(applyAttrs, {leftDelimiter, rightDelimiter});
    }

    md.use(olAttrConversion, pluginOptions);
    md.use(inlineSvgMarker, pluginOptions);

    md.use(linkifyStrikethrough);
    if (configuredPlugins) {
        configuredPlugins.forEach(({plugin, options: settings}) => {
            md.use(plugin, settings ? {...pluginOptions, ...settings} : pluginOptions);
        });
    } else {
        plugins.forEach((plugin) => md.use(plugin, pluginOptions));
    }

    if (linkify && linkifyTlds) {
        md.linkify.tlds(linkifyTlds, true);
    }
}

function initParser(
    md: MarkdownIt,
    options: OptionsType,
    env: EnvType,
    pluginOptions: MarkdownItPluginOpts,
    host: ParserHost,
) {
    return (input: string) => {
        const {
            extractTitle: extractTitleOption,
            needTitle,
            needFlatListHeadings = false,
            getPublicPath,
        } = options;

        // Run preprocessor
        input = host.preprocess(input, pluginOptions, {...options, log: pluginOptions.log}, md);

        // Generate global href link
        const href = getPublicPath ? getPublicPath(options) : '';

        // Generate MD tokens
        let tokens = md.parse(input, env);

        if (extractTitleOption) {
            const {title, tokens: slicedTokens, titleTokens} = extractTitle(tokens);

            tokens = slicedTokens;

            // title tokens include other tokens that need to be transformed
            if (titleTokens.length > 1) {
                env.title = md.renderer.render(titleTokens, md.options, env);
            } else {
                env.title = title;
            }
        }

        if (needTitle) {
            env.title = extractTitle(tokens).title;
        }

        env.headings = getHeadings(tokens, needFlatListHeadings, href);

        return tokens;
    };
}

function initCompiler(md: MarkdownIt, options: OptionsType, env: EnvType, host: ParserHost) {
    const {needToSanitizeHtml = true, renderInline = false, sanitizeOptions, sanitize} = options;

    return (tokens: Token[]) => {
        // Remove inline tokens if inline mode is activated
        if (renderInline) {
            tokens = tokens.filter((token) => token.type === 'inline');
        }

        // Generate HTML
        let html = md.renderer.render(tokens, md.options, env);

        if (!needToSanitizeHtml) {
            return html;
        }

        // If a custom sanitizer was used, we need to ensure styles are sanitized
        // unless explicitly disabled via disableStyleSanitizer option
        if (sanitize && !(sanitizeOptions?.disableStyleSanitizer ?? false)) {
            const baseOptions = sanitizeOptions || defaultOptions;

            const mergedOptions = {
                ...baseOptions,
                cssWhiteList: {
                    ...(defaultOptions.cssWhiteList || {}),
                    ...(baseOptions.cssWhiteList || {}),
                    ...(env.additionalOptionsCssWhiteList || {}),
                },
            };

            html = host.sanitizeStyles(html, mergedOptions);
        }

        const sanitizedHtml = sanitize
            ? sanitize(html, sanitizeOptions)
            : host.sanitize(html, sanitizeOptions, {
                  cssWhiteList: env.additionalOptionsCssWhiteList,
              });

        return sanitizedHtml;
    };
}
