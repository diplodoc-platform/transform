import path from 'path';
import MarkdownIt from 'markdown-it';
const generate = require('markdown-it-testgen');

import video from '../src/transform/plugins/video/index';

const assert = require('assert');

// eslint-disable-next-line no-implicit-globals
function getMfrId(html: string) {
    return html.split('"')[1];
}

describe('md-video', function () {
    const md = new MarkdownIt({}).use(video);
    generate(path.join(__dirname, 'data/video/video-fixtures.txt'), md);
});

// Because the mfr iframe requires a random id these tests cannont be part of
// the markdown-it-testgen fixture
describe('md-video-mfr', function () {
    const md = new MarkdownIt({}).use(video);

    it('make sure normal iframe generates properly when empty', function () {
        const renderedHtml = md.render('@[osf]()');
        assert.equal(renderedHtml, '<p></p>\n');
    });

    it('make sure normal iframe generates properly with guid', function () {
        const renderedHtml = md.render('@[osf](xxxxx)');
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with guid and line break', function () {
        const renderedHtml = md.render('@[osf](xxxxx\n)');
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with guid and extra space', function () {
        const renderedHtml = md.render('@[osf](xxxxx )');
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with guid and two extra spaces', function () {
        const renderedHtml = md.render('@[osf]( xxxxx )');
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with link', function () {
        const renderedHtml = md.render(
            '@[osf](https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render)',
        );
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with link and extra space', function () {
        const renderedHtml = md.render(
            '@[osf](https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render )',
        );
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with link and two extra spaces', function () {
        const renderedHtml = md.render(
            '@[osf](https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render )',
        );
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with link to staging', function () {
        const renderedHtml = md.render(
            '@[osf](https://mfr-staging3.osf.io/render?url=https://staging3.osf.io/xxxxx/?action=download%26mode=render)',
        );
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://mfr-staging3.osf.io/render?url=https://staging3.osf.io/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with link to local', function () {
        const renderedHtml = md.render(
            '@[osf](https://localhost:7778/render?url=https://localhost:5000/xxxxx/?action=download%26mode=render)',
        );
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "https://localhost:7778/render?url=https://localhost:5000/xxxxx/?action=download%26mode=render");    }); </script></p>\n',
        );
    });

    it('make sure normal iframe generates properly with link to local ip', function () {
        const renderedHtml = md.render(
            '@[osf](http://localhost:7778/render?mode=render&url=http://192.168.168.167:5000/y98tn/?action=download%26mode=render%26direct)',
        );
        const id = getMfrId(renderedHtml);
        assert.equal(
            renderedHtml,
            '<p><div id="' +
                id +
                '" class="mfr mfr-file"></div><script>$(document).ready(function () {new mfr.Render("' +
                id +
                '", "http://localhost:7778/render?mode=render&amp;url=http://192.168.168.167:5000/y98tn/?action=download%26mode=render%26direct");    }); </script></p>\n',
        );
    });
});
