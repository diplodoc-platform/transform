import path from 'path';
import MarkdownIt from 'markdown-it';

import video from '../src/transform/plugins/video/index';

const generate = require('markdown-it-testgen');

function preserveId(html: string) {
    return html
        .replace(/<div id="\d+.\d+"/, '<div id="1.2"')
        .replace(/new mfr\.Render\("\d+.\d+"/, 'new mfr.Render("1.2"');
}

describe('md-video', () => {
    const md = new MarkdownIt({}).use(video);
    generate(path.join(__dirname, 'data/video/video-fixtures.txt'), md);
});

// Because the mfr iframe requires a random id these tests cannont be part of
// the markdown-it-testgen fixture
describe('md-video-mfr', () => {
    const md = new MarkdownIt({}).use(video);

    it('make sure normal iframe generates properly when empty', () => {
        const renderedHtml = preserveId(md.render('@[osf]()'));
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with guid', () => {
        const renderedHtml = preserveId(md.render('@[osf](xxxxx)'));
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with guid and line break', () => {
        const renderedHtml = preserveId(md.render('@[osf](xxxxx\n)'));
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with guid and extra space', () => {
        const renderedHtml = preserveId(md.render('@[osf](xxxxx )'));
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with guid and two extra spaces', () => {
        const renderedHtml = preserveId(md.render('@[osf]( xxxxx )'));
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with link', () => {
        const renderedHtml = preserveId(
            md.render(
                '@[osf](https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render)',
            ),
        );
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with link and extra space', () => {
        const renderedHtml = preserveId(
            md.render(
                '@[osf](https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render )',
            ),
        );
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with link and two extra spaces', () => {
        const renderedHtml = preserveId(
            md.render(
                '@[osf](https://mfr.osf.io/render?url=https://osf.io/xxxxx/?action=download%26mode=render )',
            ),
        );
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with link to staging', () => {
        const renderedHtml = preserveId(
            md.render(
                '@[osf](https://mfr-staging3.osf.io/render?url=https://staging3.osf.io/xxxxx/?action=download%26mode=render)',
            ),
        );
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with link to local', () => {
        const renderedHtml = preserveId(
            md.render(
                '@[osf](https://localhost:7778/render?url=https://localhost:5000/xxxxx/?action=download%26mode=render)',
            ),
        );
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with link to local ip', () => {
        const renderedHtml = preserveId(
            md.render(
                '@[osf](http://localhost:7778/render?mode=render&url=http://192.168.168.167:5000/y98tn/?action=download%26mode=render%26direct)',
            ),
        );

        expect(renderedHtml).toMatchSnapshot();
    });
});

describe('md-video-vk', () => {
    const md = new MarkdownIt({}).use(video);

    it('make sure normal iframe generates properly when empty', () => {
        const renderedHtml = md.render('@[vk]()');
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with id', () => {
        const renderedHtml = md.render('@[vk](oid=-207738372&id=456239060)');
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with id and line break', () => {
        const renderedHtml = md.render('@[vk](oid=-207738372&id=456239060\n)');
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with id and two extra spaces', () => {
        const renderedHtml = md.render('@[vk]( oid=-207738372&id=456239060 )');
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with link', () => {
        const renderedHtml = md.render(
            '@[vk](https://vk.com/video_ext.php?oid=-207738372&id=456239060)',
        );
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with additional params', () => {
        const renderedHtml = md.render(
            '@[vk](https://vk.com/video_ext.php?oid=-207738372&id=456239060&hd=2&autoplay=1&width=853&height=480)',
        );
        expect(renderedHtml).toMatchSnapshot();
    });

    it('make sure normal iframe generates properly with another sort params', () => {
        const renderedHtml = md.render(
            '@[vk](https://vk.com/video_ext.php?oid=width=853&-207738372&hd=2&autoplay=1&id=456239060&height=480)',
        );
        expect(renderedHtml).toMatchSnapshot();
    });
});
