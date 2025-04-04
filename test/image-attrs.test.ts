import {join} from 'node:path';
import MarkdownIt from 'markdown-it';

import {ImageAttributesPluginOptions, imageAttrsPlugin} from '../src/transform/plugins/image-attrs';

const generate = require('markdown-it-testgen');

describe('image with attributes (inlineStyling is enabled)', () => {
    const md = new MarkdownIt({
        html: true,
        linkify: false,
        typographer: false,
    }).use<ImageAttributesPluginOptions>(imageAttrsPlugin, {enableInlineStyling: true});

    generate(join(__dirname, 'data/image-attrs/fixtures.txt'), md);
});
