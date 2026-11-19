'use strict';

import path from 'node:path';
import MarkdownIt from 'markdown-it';
import dd from 'ts-dedent';

import transform from '../src/transform';
import plugin from '../src/transform/plugins/checkbox';

const generate = require('markdown-it-testgen');
const assert = require('assert');

const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [(md) => plugin(md, {idPrefix: 'checkbox'})],
    });
    return html;
};

describe('markdown-it-checkbox', () => {
    describe('markdown-it-checkbox()', () => {
        const md = new MarkdownIt({breaks: true});

        md.use(plugin, {idPrefix: 'checkbox'});
        generate(path.join(__dirname, 'data/checkbox/checkbox.txt'), md);
        return it('should pass irrelevant markdown', () => {
            const res = md.render('# test');
            assert.equal(res, '<h1>test</h1>\n');
        });
    });

    describe('markdown-it-checkbox(options)', () => {
        it('should optionally wrap arround a div layer', () => {
            const md = new MarkdownIt({}).use(plugin, {idPrefix: 'checkbox'});
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
            const md = new MarkdownIt({}).use(plugin, {divClass: 'cb', idPrefix: 'checkbox'});
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
            const md = new MarkdownIt({}).use(plugin, {idPrefix: 'cb'});
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
            const md = new MarkdownIt({}).use(plugin, {disabled: false, idPrefix: 'checkbox'});
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

    it('should generate token stream', () => {
        const markup = dd`
        paragraph

        [ ] checkbox0
        [X] checkbox1

        [_] long
        checkbox2
        [x] long
        looong
        checkbox3
        [-] *check*
        **with**
        ~~markup~~
        `;

        const tokens = new MarkdownIt({breaks: true})
            .use(plugin, {idPrefix: 'checkbox'})
            .parse(markup, {});
        expect(tokens).toMatchSnapshot();
    });

    it('uses different default namespaces for independently rendered documents', () => {
        const documents = ['[ ] Article', '[X] Comment'].map(
            (source) => transform(source, {plugins: [plugin]}).result.html,
        );
        const ids = documents.map((html) => html.match(/id="(checkbox-[a-z0-9]+-0)"/)?.[1]);

        expect(ids).toEqual([expect.any(String), expect.any(String)]);
        expect(ids[0]).not.toBe(ids[1]);
        documents.forEach((html, index) => {
            expect(html).toContain(`for="${ids[index]}"`);
        });
    });
});
