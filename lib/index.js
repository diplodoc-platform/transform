'use strict';
const MarkdownIt = require('markdown-it');
const meta = require('markdown-it-meta');
const deflist = require('markdown-it-deflist');
const attrs = require('markdown-it-attrs');
const includes = require('./plugins/includes');
const links = require('./plugins/links');
const highlight = require('./highlight');

module.exports = function transform(input, path, opts = {}) {
    const md = new MarkdownIt({html: true, highlight});

    md.use(meta);
    md.use(deflist);
    md.use(attrs);
    md.use(includes, path);
    md.use(links, path, opts);

    const html = md.render(input);

    return {html, meta: md.meta};
};
