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

module.exports = function transform(input, opts = {}) {
    const md = new MarkdownIt({html: true, highlight})
        .use(conditions, opts)
        .use(substitutions, opts)
        .use(meta)
        .use(deflist)
        .use(attrs)
        .use(includes, opts)
        .use(links, opts)
        .use(images, opts)
        .use(keyrefs, opts)
        .use(alerts, opts)
        .use(anchors)
        .use(tabs);

    (opts.plugins || []).forEach((plugin) => {
        if (typeof plugin === 'string') {
            plugin = require(`./plugins/${plugin}`);
        }

        md.use(plugin, opts);
    });

    try {
        let title;
        let tokens;
        const env = {};

        tokens = md.parse(input, env);

        if (opts.extractTitle) {
            ({title, tokens} = extractTitle(tokens));
        }

        const headings = getHeadings(tokens);
        const html = md.renderer.render(tokens, md.options, env);
        const assets = md.assets;
        const meta = md.meta;

        return {html, title, headings, assets, meta};
    } catch (err) {
        log.error(`Error occurred in ${bold(opts.path)}`);
        throw err;
    }
};
