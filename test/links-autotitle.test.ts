import {resolve} from 'path';
import {readFileSync} from 'fs';
import {readFile} from 'node:fs/promises';

import collect from '../src/transform/plugins/includes/collect';

import {log} from './utils';

const collectLinks = (text: string, path: string) => {
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

describe('Links autotitle', () => {
    test('compile file with autotile', async () => {
        const inputPath = resolve(__dirname, './mocks/links-autotitle.md');
        const input = await readFile(inputPath, 'utf8');

        const expectPath = resolve(__dirname, './mocks/links-autotitle.expect.md');
        const expectContent = await readFile(expectPath, 'utf8');

        const result = collectLinks(input, inputPath);

        expect(result).toBe(expectContent);
    });

    test('compile file with autotile with doubling', async () => {
        const inputPath = resolve(__dirname, './mocks/links-autotitle-with-doubling.md');
        const input = await readFile(inputPath, 'utf8');

        const expectPath = resolve(__dirname, './mocks/links-autotitle-with-doubling.expect.md');
        const expectContent = await readFile(expectPath, 'utf8');

        const result = collectLinks(input, inputPath);

        expect(result).toBe(expectContent);
    });
});
