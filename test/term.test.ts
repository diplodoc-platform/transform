import {dirname, resolve} from 'path';
import {readFileSync} from 'fs';

import transform from '../src/transform';
import links from '../src/transform/plugins/links';
import term from '../src/transform/plugins/term';
import includes from '../src/transform/plugins/includes';
import code from '../src/transform/plugins/code';

const mocksPath = require.resolve('./utils.ts');

const transformYfm = (text: string, path?: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, links, code, term],
        path: path || mocksPath,
        root: dirname(path || mocksPath),
    });
    return html;
};

const clearRandomId = (str: string) => {
    const clearRandomId = new RegExp(/<([i\s]+).*?id="([^"]*?)".*?>(.+?)/, 'g');
    const randomId = clearRandomId.exec(str);

    return randomId ? str.replace(randomId[2], '') : str;
};

describe('Terms', () => {
    test('Should create term in text with definition template', () => {
        const inputPath = resolve(__dirname, './mocks/term/term.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should create term in table with definition template', () => {
        const inputPath = resolve(__dirname, './mocks/term/table.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should create term in code with definition template', () => {
        const inputPath = resolve(__dirname, './mocks/term/code.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Term should use content from include', () => {
        const inputPath = resolve(__dirname, './mocks/term/includeContent.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Term should use escape regexp like chars', () => {
        const inputPath = resolve(__dirname, './mocks/term/rxlike-term.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toMatchSnapshot();
    });
});
