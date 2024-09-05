'use strict';

import type {CheckboxOptions} from '../src/transform/plugins/checkbox/checkbox';

import path from 'path';
import MarkdownIt from 'markdown-it';

import transform from '../src/transform';
import plugin from '../src/transform/plugins/checkbox';

const generate = require('markdown-it-testgen');
const assert = require('assert');

const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [plugin],
    });
    return html;
};

describe('markdown-it-checkbox', () => {
    describe('markdown-it-checkbox()', () => {
        const md = new MarkdownIt({});

        md.use(plugin, {
            divWrap: false,
        });
        generate(path.join(__dirname, 'data/checkbox/checkbox.txt'), md);
        return it('should pass irrelevant markdown', () => {
            const res = md.render('# test');
            assert.equal(res, '<h1>test</h1>\n');
        });
    });

    describe('markdown-it-checkbox(options)', () => {
        it('should optionally wrap arround a div layer', () => {
            const md = new MarkdownIt({}).use(plugin);
            const res = md.render('[X] test written');
            assert.equal(
                res,
                '<div class="checkbox">\n' +
                    '<input type="checkbox" id="checkbox0" disabled="" checked="true">\n' +
                    '<label for="checkbox0">test written</label>\n' +
                    '</div>\n',
            );
        });

        it('should optionally change class of div layer', () => {
            const md = new MarkdownIt({}).use<CheckboxOptions>(plugin, {divClass: 'cb'});
            const res = md.render('[X] test written');
            assert.equal(
                res,
                '<div class="cb">\n' +
                    '<input type="checkbox" id="checkbox0" disabled="" checked="true">\n' +
                    '<label for="checkbox0">test written</label>\n' +
                    '</div>\n',
            );
        });

        it('should optionally change the id', () => {
            const md = new MarkdownIt({}).use<CheckboxOptions>(plugin, {idPrefix: 'cb'});
            const res = md.render('[X] test written');
            assert.equal(
                res,
                '<div class="checkbox">\n' +
                    '<input type="checkbox" id="cb0" disabled="" checked="true">\n' +
                    '<label for="cb0">test written</label>\n' +
                    '</div>\n',
            );
        });

        it('should not set disable attr to checkbox', () => {
            const md = new MarkdownIt({}).use<CheckboxOptions>(plugin, {disabled: false});
            const res = md.render('[X] check');
            assert.equal(
                res,
                '<div class="checkbox">\n' +
                    '<input type="checkbox" id="checkbox0" checked="true">\n' +
                    '<label for="checkbox0">check</label>\n' +
                    '</div>\n',
            );
        });
    });

    it('should parse inline markup in label', () => {
        expect(transformYfm('[X] text *italic* **bold** label')).toBe(
            '<div class="checkbox">\n' +
                '<input type="checkbox" id="checkbox0" disabled checked="true" />\n' +
                '<label for="checkbox0">text <em>italic</em> <strong>bold</strong> label</label>\n' +
                '</div>\n',
        );
    });
});
