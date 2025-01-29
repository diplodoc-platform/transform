import MarkdownIt from 'markdown-it';
import {mdRenderer} from '@diplodoc/markdown-it-markdown-renderer';
import meta from 'markdown-it-meta';
import sup from 'markdown-it-sup';

import cut from '~transform/plugins/cut';
import checkbox from '~transform/plugins/checkbox';
import anchors from '~transform/plugins/anchors';
import monospace from '~transform/plugins/monospace';
import imsize from '~transform/plugins/imsize';
import file from '~transform/plugins/file';
import includes from '~transform/plugins/includes';
import tabs from '~transform/plugins/tabs';
import video from '~transform/plugins/video';
import table from '~transform/plugins/table';
import notes from '~transform/plugins/notes';
import initMarkdownIt from '~transform/md';
import transform from '~transform/index';

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
