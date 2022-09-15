import {bold} from 'chalk';
import attrs from 'markdown-it-attrs';
import Token from 'markdown-it/lib/token';

import {log, LogLevels} from './log';
import makeHighlight from './highlight';
import extractTitle from './title';
import getHeadings from './headings';
import liquid from './liquid';
import sanitizeHtml, {SanitizeOptions} from './sanitize';

import notes from './plugins/notes';
import anchors from './plugins/anchors';
import code from './plugins/code';
import cut from './plugins/cut';
import deflist from './plugins/deflist';
import term from './plugins/term';
import file from './plugins/file';
import imsize from './plugins/imsize';
import meta from './plugins/meta';
import sup from './plugins/sup';
import tabs from './plugins/tabs';
import video from './plugins/video';
import monospace from './plugins/monospace';
import yfmTable from './plugins/table';
import {initMd} from './md';
import {MarkdownItPluginCb} from './plugins/typings';
import type {HighlightLangMap, Heading} from './typings';

interface OutputType {
    result: {
        html: string;
        title?: string;
        headings: Heading[];
        assets?: unknown[];
        meta?: object;
    };
    logs: Record<LogLevels, string[]>;
}
interface OptionsType {
    vars?: Record<string, string>;
    path?: string;
    extractTitle?: boolean;
    needTitle?: boolean;
    allowHTML?: boolean;
    linkify?: boolean;
    breaks?: boolean;
    conditionsInCode?: boolean;
    disableLiquid?: boolean;
    leftDelimiter?: string;
    rightDelimiter?: string;
    isLiquided?: boolean;
    needToSanitizeHtml?: boolean;
    sanitizeOptions?: SanitizeOptions;
    needFlatListHeadings?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: MarkdownItPluginCb<any>[];
    highlightLangs?: HighlightLangMap;
    root?: string;
    [x: string]: unknown;
}

function transform(originInput: string, opts: OptionsType = {}): OutputType {
    const {
        vars = {},
        path,
        extractTitle: extractTitleOption,
        needTitle,
        allowHTML = false,
        linkify = false,
        breaks = true,
        conditionsInCode = false,
        needToSanitizeHtml = false,
        sanitizeOptions,
        needFlatListHeadings = false,
        disableLiquid = false,
        leftDelimiter = '{',
        rightDelimiter = '}',
        isLiquided = false,
        plugins = [
            meta,
            deflist,
            cut,
            notes,
            anchors,
            tabs,
            code,
            sup,
            video,
            monospace,
            yfmTable,
            file,
            imsize,
            term,
        ],
        highlightLangs = {},
        ...customOptions
    } = opts;

    const pluginOptions = {
        ...customOptions,
        vars,
        path,
        extractTitle: extractTitleOption,
        disableLiquid,
        log,
    };

    const input =
        disableLiquid || isLiquided
            ? originInput
            : liquid(originInput, vars, path, {conditionsInCode});

    const highlight = makeHighlight(highlightLangs);
    const md = initMd({html: allowHTML, linkify, highlight, breaks});
    // Need for ids of headers
    md.use(attrs, {leftDelimiter, rightDelimiter});

    plugins.forEach((plugin) => md.use(plugin, pluginOptions));

    try {
        let title;
        let tokens;
        let titleTokens;
        const env = {} as {[key: string]: Token[] | unknown};

        tokens = md.parse(input, env);

        if (extractTitleOption) {
            ({title, tokens, titleTokens} = extractTitle(tokens));

            // title tokens include other tokens that need to be transformed
            if (titleTokens.length > 1) {
                title = md.renderer.render(titleTokens, md.options, env);
            }
        }
        if (needTitle) {
            ({title} = extractTitle(tokens));
        }

        const headings = getHeadings(tokens, needFlatListHeadings);

        // add all term template tokens to the end of the html
        const termTokens = (env.termTokens as Token[]) || [];
        let html = md.renderer.render([...tokens, ...termTokens], md.options, env);
        if (needToSanitizeHtml) {
            html = sanitizeHtml(html, sanitizeOptions);
        }

        const assets = md.assets;
        const meta = md.meta;

        return {
            result: {html, title, headings, assets, meta},
            logs: log.get(),
        };
    } catch (err) {
        log.error(`Error occurred${path ? ` in ${bold(path)}` : ''}`);
        throw err;
    }
}

export = transform;

// eslint-disable-next-line @typescript-eslint/no-namespace -- backward compatibility
namespace transform {
    export type Options = OptionsType;
    export type Output = OutputType;
}
