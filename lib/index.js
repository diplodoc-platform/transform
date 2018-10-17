'use strict';
const {bold} = require('chalk');
const log = require('./log');
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
const highlight = require('./highlight');
const extractTitle = require('./title');
const getHeadings = require('./headings');

module.exports = function transform(input, opts = {}) {
    const md = new MarkdownIt({html: true, highlight})
        .use(meta)
        .use(deflist)
        .use(attrs)
        .use(includes, opts)
        .use(links, opts)
        .use(images, opts)
        .use(keyrefs, opts)
        .use(alerts)
        .use(anchors)
        .use(tabs);

    let title;
    let tokens;
    let headings;
    let html;

    try {
        const env = {};
        tokens = md.parse(input, env);

        if (opts.extractTitle) {
            ({title, tokens} = extractTitle(tokens));
        }

        headings = getHeadings(tokens);
        html = md.renderer.render(tokens, md.options, env);
    } catch (err) {
        log.error(`Error occurred in ${bold(opts.path)}`);
        throw err;
    }

    return {
        html: html,
        title: title,
        headings: headings,
        meta: md.meta
    };
};
