import {getPublicPath} from '../src/transform/utilsFS';
import {PAGE_LINK_REGEXP, defaultTransformLink} from '../src/transform/utils';

const assert = require('assert');

describe('PAGE_LINK_REGEXP', function () {
    it('make sure .md is page', function () {
        assert.equal(PAGE_LINK_REGEXP.test('abc/page.md'), true);
    });

    it('make sure .yaml is page', function () {
        assert.equal(PAGE_LINK_REGEXP.test('abc/page.yaml'), true);
    });

    it('make sure .yml is page', function () {
        assert.equal(PAGE_LINK_REGEXP.test('abc/page.yml'), true);
    });

    it('make sure .html is not page', function () {
        assert.equal(PAGE_LINK_REGEXP.test('abc/page.html'), false);
    });

    it('make sure .mdm is not page', function () {
        assert.equal(PAGE_LINK_REGEXP.test('abc/page.mdm'), false);
    });
});

describe('defaultTransformLink', function () {
    it('make sure .md is removed', function () {
        assert.equal(defaultTransformLink('abc/page.md'), 'abc/page.html');
    });

    it('make sure .yaml is removed', function () {
        assert.equal(defaultTransformLink('abc/page.yaml'), 'abc/page.html');
    });

    it('make sure .yml is removed', function () {
        assert.equal(defaultTransformLink('abc/page.yml'), 'abc/page.html');
    });

    it('make sure empty is not changed', function () {
        assert.equal(defaultTransformLink('abc/page'), 'abc/page');
    });

    it('make sure .test is not changed', function () {
        assert.equal(defaultTransformLink('abc/page.test'), 'abc/page.test');
    });
});

describe('getPublicPath', function () {
    it('make sure local path includes rootPublicPath', function () {
        assert.equal(
            getPublicPath({
                path: './ru/test.md',
                root: './',
                rootPublicPath: 'ru',
            }),
            'test.html',
        );
    });

    it('make sure local path does not include rootPublicPath', function () {
        assert.equal(
            getPublicPath({
                path: './ru/test.md',
                root: './',
                rootPublicPath: '',
            }),
            'ru/test.html',
        );
    });

    it('make sure local path with only path', function () {
        assert.equal(
            getPublicPath({
                path: './test.md',
            }),
            'test.html',
        );
    });

    it('make sure local path with only input path', function () {
        assert.equal(
            getPublicPath(
                {
                    path: './test.md',
                },
                './test2.md',
            ),
            'test2.html',
        );
    });
});
