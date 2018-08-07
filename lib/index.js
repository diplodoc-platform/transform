'use strict';
const MarkdownIt = require('markdown-it');
const meta = require('markdown-it-meta');
const deflist = require('markdown-it-deflist');
const attrs = require('markdown-it-attrs');
const includes = require('./plugins/includes');
const links = require('./plugins/links');
const {getKeys, keyrefs} = require('./plugins/keyrefs');
const highlight = require('./highlight');

module.exports = function transform(input, opts) {
    const keys = getKeys(opts);

    const md = new MarkdownIt({html: true, highlight})
        .use(meta)
        .use(deflist)
        .use(attrs)
        .use(includes, opts)
        .use(links, opts)
        .use(keyrefs, keys);

    return {
        html: md.render(input),
        meta: md.meta
    };
};
