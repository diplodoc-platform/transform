const {bold} = require('chalk');
const MarkdownIt = require('markdown-it');

const plugins = require('./plugins');
const log = require('./log');
const highlight = require('./highlight');
const extractTitle = require('./title');
const getHeadings = require('./headings');
const liquid = require('./liquid');

const {alerts, attrs, anchors, code, cut, deflist, imsize, meta, sup, tabs} = plugins;

function transform(originInput, opts = {}) {
    const {
        vars = {}, path, extractTitle: extractTitleOption, needTitle,
        allowHTML = false, linkify = false, breaks = true,
        plugins = [attrs, meta, deflist, cut, alerts, anchors, tabs, code, imsize, sup],
        ...customOptions
    } = opts;
    const pluginOptions = {
        ...customOptions,
        vars,
        path,
        extractTitleOption,
    };

    const input = liquid(originInput, vars, path);

    const md = new MarkdownIt({html: allowHTML, linkify, highlight, breaks});
    plugins.forEach((plugin) => md.use(plugin, pluginOptions));

    try {
        let title;
        let tokens;
        const env = {};

        tokens = md.parse(input, env);

        if (extractTitleOption) {
            ({title, tokens} = extractTitle(tokens));
        }
        if (needTitle) {
            ({title} = extractTitle(tokens));
        }

        const headings = getHeadings(tokens);
        const html = md.renderer.render(tokens, md.options, env);
        const assets = md.assets;
        const meta = md.meta;

        return {html, title, headings, assets, meta};
    } catch (err) {
        log.error(`Error occurred${path ? ` in ${bold(path)}` : ''}`);
        throw err;
    }
}

transform.plugins = plugins;

module.exports = transform;
