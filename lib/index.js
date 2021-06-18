const {bold} = require('chalk');
const MarkdownIt = require('markdown-it');

const plugins = require('./plugins');
const log = require('./log');
const makeHighlight = require('./highlight');
const extractTitle = require('./title');
const getHeadings = require('./headings');
const liquid = require('./liquid');

const {notes, attrs, anchors, code, cut, deflist, imsize, meta, sup, tabs, video} = plugins;

function transform(originInput, opts = {}) {
    const {
        vars = {}, path, extractTitle: extractTitleOption, needTitle,
        allowHTML = false, linkify = false, breaks = true, conditionsInCode = false, disableLiquid = false,
        plugins = [attrs, meta, deflist, cut, notes, anchors, tabs, code, imsize, sup, video], highlightLangs = {},
        ...customOptions
    } = opts;
    const pluginOptions = {
        ...customOptions,
        vars,
        path,
        extractTitleOption,
        disableLiquid,
        log,
    };

    const input = disableLiquid ? originInput : liquid(originInput, vars, path, {conditionsInCode});

    const highlight = makeHighlight(highlightLangs);
    const md = new MarkdownIt({html: allowHTML, linkify, highlight, breaks});
    plugins.forEach((plugin) => md.use(plugin, pluginOptions));

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

transform.plugins = plugins;

module.exports = transform;
