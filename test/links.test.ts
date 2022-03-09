import {dirname, resolve} from 'path';
import {readFileSync} from 'fs';
import transform from '../src/transform';
import links from '../src/transform/plugins/links';
import includes from '../src/transform/plugins/includes';
import {callPlugin, tokenize} from './utils';
import {title, customTitle} from './data/links';

import {log} from '../src/transform/log';

const mocksPath = require.resolve('./utils.ts');

const transformYfm = (text: string, path?: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, links],
        path: path || mocksPath,
        root: dirname(path || mocksPath),
    });
    return html;
};

describe('Links', () => {
    test('Should create link with custom title', () => {
        const result = callPlugin(
            links,
            tokenize([
                'Text before link',
                '',
                '[Custom title](./mocks/link.md) %}',
                '',
                'After link',
            ]),
            {
                path: mocksPath,
                root: dirname(mocksPath),
                log: log,
            },
        );

        expect(result).toEqual(customTitle);
    });

    test('Should create link with title from target', () => {
        const result = callPlugin(
            links,
            tokenize(['Text before link', '', '[{#T}](./mocks/link.md)', '', 'After link']),
            {
                path: mocksPath,
                root: dirname(mocksPath),
            },
        );

        expect(result).toEqual(title);
    });

    test('Should create link with title from target with include in the middle', () => {
        const input = '[{#T}](./mocks/include-link.md)';
        const result = transformYfm(input);

        expect(result).toEqual('<p><a href="./mocks/include-link.html">Title</a></p>\n');
    });

    test('Should create link with title from target with circular include', () => {
        const inputPath = resolve(__dirname, './mocks/circular-include/first.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toEqual('<h1>First</h1>\n<p><a href="./second.html">Second</a></p>\n');
    });

    test('Should create link with title from target with circular link', () => {
        const inputPath = resolve(__dirname, './mocks/circular-link/first.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toEqual('<h1>First</h1>\n<p><a href="./second.html">Second</a></p>\n');
    });
});
