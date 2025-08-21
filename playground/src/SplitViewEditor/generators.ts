import MarkdownIt from 'markdown-it';
import {mdRenderer} from '@diplodoc/markdown-it-markdown-renderer';
import meta from '@local/transform/plugins/meta';
import sup from 'markdown-it-sup';
import cut from '@local/transform/plugins/cut';
import checkbox from '@local/transform/plugins/checkbox';
import anchors from '@local/transform/plugins/anchors';
import monospace from '@local/transform/plugins/monospace';
import imsize from '@local/transform/plugins/imsize';
import file from '@local/transform/plugins/file';
import includes from '@local/transform/plugins/includes';
import tabs from '@local/transform/plugins/tabs';
import video from '@local/transform/plugins/video';
import table from '@local/transform/plugins/table';
import notes from '@local/transform/plugins/notes';
import initMarkdownIt from '@local/transform/md';
import transform from '@local/transform/index';

const diplodocOptions = {
    lang: 'en',
    path: '',
};

function generateMD(input: string) {
    const md = new MarkdownIt({html: true});

    md.use(meta);
    md.use(notes, diplodocOptions);
    md.use(cut, diplodocOptions);
    md.use(sup, diplodocOptions);
    md.use(checkbox, diplodocOptions);
    md.use(anchors, diplodocOptions);
    md.use(monospace, diplodocOptions);
    md.use(imsize, diplodocOptions);
    md.use(file, diplodocOptions);
    md.use(includes, diplodocOptions);
    md.use(tabs, diplodocOptions);
    md.use(video, diplodocOptions);
    md.use(table, diplodocOptions);
    md.use(mdRenderer);

    try {
        return md.render(input, {source: input.split('\n')});
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);

        return '';
    }
}

function generateHTML(input: string) {
    try {
        return transform(input).result.html;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);

        return '';
    }
}

function generateTokens(input: string) {
    const {parse} = initMarkdownIt({});

    try {
        const tokens = parse(input);

        return tokens?.length ? JSON.stringify(tokens, null, 4) : '';
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);

        return '';
    }
}

export {generateHTML, generateMD, generateTokens};
export default {generateHTML, generateMD, generateTokens};
