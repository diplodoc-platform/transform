'use strict';

const {bold} = require('chalk');
const MarkdownIt = require('markdown-it');

const conditions = require('./plugins/conditions');

const log = require('./log');
const highlight = require('./highlight');
const renderer = require('./renderer');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

module.exports = function transform(input, opts = {}) {
    const match = R_LIQUID.exec(input);

    if (!match) {
        return input;
    }

    const md = new MarkdownIt({html: true, highlight}).use(conditions, opts);

    try {
        const tokens = md.parse(input, {});

        return renderer(tokens);
    } catch (err) {
        log.error(`Error occurred in ${bold(opts.path)}`);
        throw err;
    }
};
