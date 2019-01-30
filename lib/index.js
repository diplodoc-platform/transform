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
const conditions = require('./plugins/conditions');
const substitutions = require('./plugins/substitutions');

const log = require('./log');
const highlight = require('./highlight');
const extractTitle = require('./title');
const getHeadings = require('./headings');

module.exports = function transform(
    input,
    {
        vars = {}, skipErrors, path, root, transformLink, assetsPublicPath, lang, plugins = [],
        extractTitle: extractTitleOption, notFoundCb = () => {}, oneFile
    } = {}
) {
    const md = new MarkdownIt({html: true, highlight})
        .use(attrs)
        .use(conditions, {vars, skipErrors})
        .use(substitutions, {vars, path})
        .use(meta)
        .use(deflist)
        .use(includes, {path, skipErrors, notFoundCb, root})
        .use(links, {path, transformLink, oneFile, root})
        .use(images, {path, root, assetsPublicPath})
        .use(keyrefs, {path, root})
        .use(alerts, {lang})
        .use(anchors)
        .use(tabs);

    plugins.forEach((plugin) => {
        if (typeof plugin === 'string') {
            plugin = require(`./plugins/${plugin}`);
        }

        md.use(plugin);
    });

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
