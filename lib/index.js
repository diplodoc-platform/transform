'use strict';

const {bold} = require('chalk');
const MarkdownIt = require('markdown-it');
const meta = require('markdown-it-meta');
const deflist = require('markdown-it-deflist');
const attrs = require('markdown-it-attrs');

const includes = require('./plugins/includes');
const links = require('./plugins/links');
const images = require('./plugins/images');
const keyrefs = require('./plugins/keyrefs');
const alerts = require('./plugins/alerts');
const anchors = require('./plugins/anchors');
const tabs = require('./plugins/tabs');

const log = require('./log');
const highlight = require('./highlight');
const extractTitle = require('./title');
const getHeadings = require('./headings');
const liquid = require('./liquid');
const {buildVars} = require('./vars');

module.exports = function transform(input, opts = {}) {
    const {
        vars = {}, varsPreset, skipErrors, path, root, transformLink, assetsPublicPath, lang, plugins,
        extractTitle: extractTitleOption, notFoundCb = () => {}, oneFile
    } = opts;

    let md;

    const builtVars = buildVars(vars, varsPreset, path, root);
    input = liquid(input, builtVars, skipErrors);

    if (!plugins) {
        md = new MarkdownIt({html: true, linkify: true, highlight})
            .use(attrs)
            .use(meta)
            .use(deflist)
            .use(includes, {path, skipErrors, notFoundCb, root})
            .use(links, {path, transformLink, oneFile, root})
            .use(images, {path, root, assetsPublicPath})
            .use(keyrefs, {path, root})
            .use(alerts, {lang})
            .use(anchors)
            .use(tabs);
    } else {
        md = new MarkdownIt({html: true, highlight});

        plugins.forEach((plugin) => {
            if (typeof plugin === 'string') {
                plugin = require(`./plugins/${plugin}`);
            }

            md.use(plugin, opts);
        });
    }

    try {
        let title;
        let tokens;
        const env = {};

        tokens = md.parse(input, env);

        if (extractTitleOption) {
            ({title, tokens} = extractTitle(tokens));
        }

        const headings = getHeadings(tokens);
        const html = md.renderer.render(tokens, md.options, env);
        const assets = md.assets;
        const meta = md.meta;

        return {html, title, headings, assets, meta};
    } catch (err) {
        log.error(`Error occurred in ${bold(path)}`);
        throw err;
    }
};
