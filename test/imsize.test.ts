import path from 'path';
import MarkdownIt from 'markdown-it';

import imsize from '../src/transform/plugins/imsize';

const generate = require('markdown-it-testgen');

describe('imsize', () => {
    const md = new MarkdownIt({
        html: true,
        linkify: false,
        typographer: false,
    }).use(imsize);

    generate(path.join(__dirname, 'data/imsize/imsize-fixtures.txt'), md);
});
