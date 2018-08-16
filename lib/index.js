'use strict';
const MarkdownIt = require('markdown-it');
const meta = require('markdown-it-meta');
const deflist = require('markdown-it-deflist');
const attrs = require('markdown-it-attrs');
const includes = require('./plugins/includes');
const links = require('./plugins/links');
const {getKeys, keyrefs} = require('./plugins/keyrefs');
const alerts = require('./plugins/alerts');
const anchors = require('./plugins/anchors');
const tabs = require('./plugins/tabs');
const highlight = require('./highlight');
const extractTitle = require('./title');
const getHeadings = require('./headings');

module.exports = function transform(input, opts = {}) {
    const keys = getKeys(opts);

    const md = new MarkdownIt({html: true, highlight})
        .use(meta)
        .use(deflist)
        .use(attrs)
        .use(includes, opts)
        .use(links, opts)
        .use(keyrefs, keys)
        .use(alerts)
        .use(anchors)
        .use(tabs);

    const env = {};
    let title = '', tokens = md.parse(input, env);

    if (opts.extractTitle) {
        ({title, tokens} = extractTitle(tokens));
    }

    const headings = getHeadings(tokens);
    const html = md.renderer.render(tokens, md.options, env);

    return {
        html: html,
        title: title,
        headings: headings,
        meta: md.meta
    };
};
