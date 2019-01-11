'use strict';

const transformToHTML = require('./transformToHTML');
const transformToYFM = require('./transformToYFM');

module.exports = function transform(input, opts = {}) {
    if (opts.outputFormat === 'html') {
        return transformToHTML(input, opts);
    }

    if (opts.outputFormat === 'yfm') {
        return transformToYFM(input, opts);
    }
};
