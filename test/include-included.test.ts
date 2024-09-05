import {resolve} from 'path';
import {readFileSync} from 'fs';
import {readFile} from 'node:fs/promises';
import transform from '../src/transform';
import collect from '../src/transform/plugins/includes/collect';
import includes from '../src/transform/plugins/includes';
import {log} from './utils';

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

const collectIncluded = (text: string, path: string) => {
    const result = collect(text, {
        included: true,
        path: path,
        root: resolve(path, '../'),
        copyFile: (includePath) => readFileSync(includePath, 'utf-8'),
        singlePage: false,
        destPath: '',
        isLintRun: false,
        lang: 'ru',
        rootPublicPath: '',
        log: log.log,
    });
    return result;
};

describe('Included to md', () => {
    describe('includes', () => {
        test('compile file with 3 included', async () => {
            const inputPath = resolve(__dirname, './mocks/include-included-3.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/include-included-3.expect.md');
            const expectContent = await readFile(expectPath, 'utf8');

            const result = collectIncluded(input, inputPath);

            expect(result).toBe(expectContent);
        });

        test('compile file with 3 included into html', async () => {
            const inputPath = resolve(__dirname, './mocks/include-included-3.expect.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/include-included-3.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });

        test('compile file with 3 deep included', async () => {
            const inputPath = resolve(__dirname, './mocks/include-included-3-deep.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/include-included-3-deep.expect.md');
            const expectContent = await readFile(expectPath, 'utf8');

            const result = collectIncluded(input, inputPath);

            expect(result).toBe(expectContent);
        });

        test('compile file with 3 deep included into html', async () => {
            const inputPath = resolve(__dirname, './mocks/include-included-3-deep.expect.md');
            const input = await readFile(inputPath, 'utf8');

            const expectPath = resolve(__dirname, './mocks/include-included-3-deep.expect.html');
            const expectContent = await readFile(expectPath, 'utf8');

            const html = transformYfm(input);

            expect(html).toBe(expectContent);
        });
    });
});
