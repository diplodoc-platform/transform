const notes = require('./notes');
const anchors = require('./anchors');
const attrs = require('markdown-it-attrs');
const code = require('./code');
const cut = require('./cut');
const deflist = require('markdown-it-deflist');
const images = require('./images');
const imsize = require('markdown-it-imsize');
const includes = require('./includes');
const links = require('./links');
const meta = require('markdown-it-meta');
const sup = require('markdown-it-sup');
const tabs = require('./tabs');

module.exports = {
    notes,
    anchors,
    attrs,
    code,
    cut,
    deflist,
    images,
    imsize,
    includes,
    links,
    meta,
    sup,
    tabs,
};
