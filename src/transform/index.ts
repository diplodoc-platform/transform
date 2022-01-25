import {bold} from 'chalk';
import attrs from 'markdown-it-attrs';

import {Logger as log} from './log';
import makeHighlight from './highlight';
import extractTitle from './title';
import getHeadings from './headings';
import liquid from './liquid';

import notes from './plugins/notes';
import anchors from './plugins/anchors';
import code from './plugins/code';
import cut from './plugins/cut';
import deflist from './plugins/deflist';
import meta from './plugins/meta';
import sup from './plugins/sup';
import tabs from './plugins/tabs';
import video from './plugins/video';
import monospace from './plugins/monospace';
import yfmTable from './plugins/table';
import {PluginSimple} from 'markdown-it';
import {initMd} from './md';

function transform(originInput: string, opts: Record<string, any> = {}) {
    const {
        vars = {},
        path,
        extractTitle: extractTitleOption,
        needTitle,
        allowHTML = false,
        linkify = false,
        breaks = true,
        conditionsInCode = false,
        disableLiquid = false,
        leftDelimiter = '{',
        rightDelimiter = '}',
        isLiquided = false,
        plugins = [meta, deflist, cut, notes, anchors, tabs, code, sup, video, monospace, yfmTable],
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
    plugins.forEach((plugin: PluginSimple) => md.use(plugin, pluginOptions));

    try {
        let title;
        let tokens;
        let titleTokens;
        const env = {};

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

        const headings = getHeadings(tokens);
        const html = md.renderer.render(tokens, md.options, env);

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

export default transform;
