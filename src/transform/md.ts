import type {EnvType, MarkdownIt, MarkdownItPluginOpts, OptionsType} from './typings';
import type Token from 'markdown-it/lib/token';

import DefaultMarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';

import DefaultPlugins from './plugins';
import {preprocess} from './preprocessors';
import {log} from './log';
import makeHighlight from './highlight';
import extractTitle from './title';
import getHeadings from './headings';
import sanitizeHtml, {defaultOptions, sanitizeStyles} from './sanitize';
import {olAttrConversion} from './plugins/ol-attr-conversion';
import inlineCode from './plugins/inline-code';
import {DEFAULT_LANG} from './constants';

function initMarkdownIt(options: OptionsType) {
    const {
        allowHTML = false,
        linkify = false,
        breaks = true,
        highlightLangs = {},
        disableRules = [],
    } = options;

    const highlight = makeHighlight(highlightLangs);
    const md = new DefaultMarkdownIt({html: allowHTML, linkify, highlight, breaks}) as MarkdownIt;

    if (disableRules?.length) {
        md.disable(disableRules);
    }

    const env = {
        // TODO: move md.meta directly to env
        get meta() {
            return md.meta;
        },

        set meta(value) {
            md.meta = value;
        },

        // TODO: move md.assets directly to env
        get assets() {
            return md.assets;
        },

        set assets(value) {
            md.assets = value;
        },

        headings: [],
        title: '',
    } as EnvType;

    // Plugin options is the plugin context that remains during the build of one file
    const pluginOptions = getPluginOptions(options);

    // Init the plugins. Which install the md rules (core, block, ...)
    initPlugins(md, options, pluginOptions);

    // Init preprocessor and MD parser
    const parse = initParser(md, options, env, pluginOptions);

    // Init render to HTML compiler
    const compile = initCompiler(md, options, env);

    return {parse, compile, env};
}

function getPluginOptions(options: OptionsType) {
    const {
        vars = {},
        path,
        extractTitle,
        conditionsInCode = false,
        disableLiquid = false,
        lang = DEFAULT_LANG,
        ...customOptions
    } = options;

    return {
        ...customOptions,
        conditionsInCode,
        vars,
        path,
        extractTitle,
        disableLiquid,
        log,
        lang,
    } as MarkdownItPluginOpts;
}

function initPlugins(md: MarkdownIt, options: OptionsType, pluginOptions: MarkdownItPluginOpts) {
    const {
        linkify = false,
        linkifyTlds,
        leftDelimiter = '{',
        rightDelimiter = '}',
        plugins = DefaultPlugins,
        disableInlineCode,
        enableMarkdownAttrs,
    } = options;

    // TODO: set enableMarkdownAttrs to false by default in next major
    if (enableMarkdownAttrs !== false) {
        // Need for ids of headers
        md.use(attrs, {leftDelimiter, rightDelimiter});
    }

    md.use(olAttrConversion);

    if (!disableInlineCode) {
        md.use(inlineCode, pluginOptions);
    }

    plugins.forEach((plugin) => md.use(plugin, pluginOptions));

    if (linkify && linkifyTlds) {
        md.linkify.tlds(linkifyTlds, true);
    }
}

function initParser(
    md: MarkdownIt,
    options: OptionsType,
    env: EnvType,
    pluginOptions: MarkdownItPluginOpts,
) {
    return (input: string) => {
        const {
            extractTitle: extractTitleOption,
            needTitle,
            needFlatListHeadings = false,
            getPublicPath,
        } = options;

        // Run preprocessor
        input = preprocess(input, pluginOptions, options, md);

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

function initCompiler(md: MarkdownIt, options: OptionsType, env: EnvType) {
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

            html = sanitizeStyles(html, mergedOptions);
        }

        const sanitizedHtml = sanitize
            ? sanitize(html, sanitizeOptions)
            : sanitizeHtml(html, sanitizeOptions, {
                  cssWhiteList: env.additionalOptionsCssWhiteList,
              });

        return sanitizedHtml;
    };
}

export = initMarkdownIt;
