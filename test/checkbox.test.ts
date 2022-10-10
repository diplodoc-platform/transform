'use strict';

import path from 'path';
import plugin from '../src/transform/plugins/checkbox';
import MarkdownIt from 'markdown-it';

const generate = require('markdown-it-testgen');
const assert = require('assert');

describe('markdown-it-checkbox', function () {
    describe('markdown-it-checkbox()', function () {
        const md = new MarkdownIt({});

        md.use(plugin, {
            divWrap: false,
        });
        generate(path.join(__dirname, 'data/checkbox/checkbox.txt'), md);
        return it('should pass irrelevant markdown', function () {
            const res = md.render('# test');
            assert.equal(res, '<h1>test</h1>\n');
        });
    });
    return describe('markdown-it-checkbox(options)', function () {
        it('should should optionally wrap arround a div layer', function () {
            const md = new MarkdownIt({});

            md.use(plugin);
            const res = md.render('[X] test written');
            assert.equal(
                res,
                '<div class="checkbox">\n' +
                    '<input type="checkbox" id="checkbox0" disabled="" checked="true">\n' +
                    '<label for="checkbox0">test written</label>\n' +
                    '</div>\n',
            );
        });
        it('should should optionally change class of div layer', function () {
            const md = new MarkdownIt({});

            md.use(plugin, {
                divClass: 'cb',
            });
            const res = md.render('[X] test written');
            assert.equal(
                res,
                '<div class="cb">\n' +
                    '<input type="checkbox" id="checkbox0" disabled="" checked="true">\n' +
                    '<label for="checkbox0">test written</label>\n' +
                    '</div>\n',
            );
        });
        return it('should should optionally change the id', function () {
            const md = new MarkdownIt({});

            md.use(plugin, {
                idPrefix: 'cb',
            });
            const res = md.render('[X] test written');
            assert.equal(
                res,
                '<div class="checkbox">\n' +
                    '<input type="checkbox" id="cb0" disabled="" checked="true">\n' +
                    '<label for="cb0">test written</label>\n' +
                    '</div>\n',
            );
        });
    });
});
