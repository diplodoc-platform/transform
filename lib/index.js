'use strict';
const MarkdownIt = require('markdown-it');
const meta = require('markdown-it-meta');
const deflist = require('markdown-it-deflist');
const attrs = require('markdown-it-attrs');
const includes = require('./plugins/includes');
const links = require('./plugins/links');
const {getKeys, keyrefs} = require('./plugins/keyrefs');
const highlight = require('./highlight');
const extractTitle = require('./title');

module.exports = function transform(input, opts = {}) {
    const keys = getKeys(opts);

    const md = new MarkdownIt({html: true, highlight})
        .use(meta)
        .use(deflist)
        .use(attrs)
        .use(includes, opts)
        .use(links, opts)
        .use(keyrefs, keys);

    const env = {};
    let title = '', tokens = md.parse(input, env);

    if (opts.extractTitle) {
        ({title, tokens} = extractTitle(tokens));
    }

    const html = md.renderer.render(tokens, md.options, env);

    return {
        html: html,
        title: title,
        meta: md.meta
    };
};
