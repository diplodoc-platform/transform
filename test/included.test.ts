import {resolve} from 'path';
import {readFile} from 'node:fs/promises';

import transform from '../src/transform';
import includes from '../src/transform/plugins/includes';

const transformYfm = (text: string, path = 'mocks/included.md') => {
    const {
        result: {html},
    } = transform(text, {
        included: true,
        plugins: [includes],
        disableRules: ['link'],
        path: path,
        root: resolve(path, '../'),
    });
    return html;
};

describe('Included to html', () => {
    describe('includes', () => {
        test('compile file with 1 included', async () => {
            const inputPath = resolve(__dirname, './mocks/included.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/included.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });

        test('compile file with 2 included', async () => {
            const inputPath = resolve(__dirname, './mocks/included-2.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/included-2.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });

        test('compile file with 3 included', async () => {
            const inputPath = resolve(__dirname, './mocks/included-3.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/included-3.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });

        test('compile file with 4 included', async () => {
            const inputPath = resolve(__dirname, './mocks/included-4.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/included-4.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });

        test('compile file with 2 nested depth included', async () => {
            const inputPath = resolve(__dirname, './mocks/included-2-nest.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/included-2-nest.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });

        test('compile file with 3 nested depth included', async () => {
            const inputPath = resolve(__dirname, './mocks/included-3-nest.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/included-3-nest.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });
    });
});
