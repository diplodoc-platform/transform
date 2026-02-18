import {dirname, resolve} from 'path';
import {readFileSync} from 'fs';

import transform from '../src/transform';
import links from '../src/transform/plugins/links';
import term from '../src/transform/plugins/term';
import includes from '../src/transform/plugins/includes';
import code from '../src/transform/plugins/code';
import sup from '../src/transform/plugins/sup';

const mocksPath = require.resolve('./utils.ts');

const transformYfm = (text: string, path?: string, opts?: Object) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, links, code, sup, term],
        path: path || mocksPath,
        root: dirname(path || mocksPath),
        ...opts,
    });
    return html;
};

const clearRandomId = (str: string) => {
    const clearRandomId = new RegExp(/<([i\s]+).*?id="([^"]*?)".*?>(.+?)/, 'g');
    let randomId = clearRandomId.exec(str);
    while (randomId) {
        str = str.replace(randomId[2], '');
        randomId = clearRandomId.exec(str);
    }
    return str;
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

    test('should create term in code with line-numbers and line-wrapping', () => {
        const inputPath = resolve(__dirname, './mocks/term/code-line-numbers.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath, {codeLineWrapping: true});

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

    test('Should handle asterisk inside term text', () => {
        const inputPath = resolve(__dirname, './mocks/term/asterisk-in-text.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should preserve regular links and convert term links', () => {
        const inputPath = resolve(__dirname, './mocks/term/with-regular-link.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('href="https://example.com"');
        expect(result).toContain('yfm-term_title');
        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should strip undefined term links and keep content', () => {
        const inputPath = resolve(__dirname, './mocks/term/undefined-term.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('yfm-term_title');
        expect(result).not.toContain('href="*notexist"');
        expect(result).toContain('undefined');
        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should emit lint token for undefined term in lint mode', () => {
        const inputPath = resolve(__dirname, './mocks/term/undefined-term.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath, {isLintRun: true});

        expect(result).toContain('yfm-term_title');
        expect(result).not.toContain('href="*notexist"');
        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should handle term inside superscript', () => {
        const inputPath = resolve(__dirname, './mocks/term/term-in-superscript.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('yfm-term_title');
        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should handle term inside link text without crashing', () => {
        const inputPath = resolve(__dirname, './mocks/term/term-in-link.md');
        const input = readFileSync(inputPath, 'utf8');

        expect(() => transformYfm(input, inputPath)).not.toThrow();
    });
});
