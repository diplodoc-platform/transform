import type MarkdownIt from 'markdown-it';
import type StateCore from 'markdown-it/lib/rules_core/state_core';

import {dirname, resolve} from 'path';
import {readFileSync} from 'fs';

import transform from '../src/transform';
import links from '../src/transform/plugins/links';
import term from '../src/transform/plugins/term';
import includes from '../src/transform/plugins/includes';
import code from '../src/transform/plugins/code';
import sup from '../src/transform/plugins/sup';
import cut from '../src/transform/plugins/cut';
import tabs from '../src/transform/plugins/tabs';

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

    test('Should handle term with multiple includes separated by blank lines', () => {
        const inputPath = resolve(__dirname, './mocks/term/multi-include.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('yfm-term_title');
        expect(result).toContain('First part of the definition');
        expect(result).toContain('Second part of the definition');
        expect(result).toContain('Third part of the definition');
        expect(result).not.toContain('Simple definition');
    });

    test('Should remove unused term definition when reference is inside false condition', () => {
        const inputPath = resolve(__dirname, './mocks/term/unused-term.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('id=":html_element"');
        expect(result).not.toContain('id=":css_element"');
        expect(clearRandomId(result)).toMatchSnapshot();
    });

    test('Should keep term definition when reference is only in fenced code block', () => {
        const inputPath = resolve(__dirname, './mocks/term/code.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('id=":html_element"');
    });

    test('Should keep term definition when reference is only in indented code block', () => {
        const inputPath = resolve(__dirname, './mocks/term/code-block.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('id=":html_element"');
    });

    test('Should keep term definition when reference is only in inline code', () => {
        const inputPath = resolve(__dirname, './mocks/term/code-inline.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('id=":html_element"');
    });

    test('Should keep term definitions when references are inside interactive elements', () => {
        const inputPath = resolve(__dirname, './mocks/term/interactive-elements.md');
        const input = readFileSync(inputPath, 'utf8');
        const {
            result: {html},
        } = transform(input, {
            plugins: [includes, links, code, cut, tabs, term],
            path: inputPath,
            root: dirname(inputPath),
        });

        expect(html).toContain('id=":html_element"');
        expect(html).toContain('id=":css_element"');
        expect(html).toContain('id=":js_element"');
        expect(html).toContain('id=":ts_element"');

        expect(html).toContain('term-key=":html"');
        expect(html).toContain('term-key=":css"');
        expect(html).toContain('term-key=":js"');
        expect(html).toContain('term-key=":ts"');
    });

    test('Should handle document without any terms', () => {
        const input = '# Hello\n\nThis is a document without any terms.';
        const result = transformYfm(input);

        expect(result).toContain('<h1>Hello</h1>');
        expect(result).toContain('This is a document without any terms.');
        expect(result).not.toContain('dfn');
        expect(result).not.toContain('term-key');
    });

    test('Should handle document with term definition but no references', () => {
        const input = '[*unused]: This term is never referenced.\n\n# Hello\n\nNo terms here.';
        const result = transformYfm(input);

        expect(result).not.toContain('id=":unused_element"');
        expect(result).toContain('<h1>Hello</h1>');
    });

    describe('multilineTermDefinitions', () => {
        const transformMultiline = (text: string, path?: string, opts?: Object) => {
            const {
                result: {html},
            } = transform(text, {
                plugins: [includes, links, code, sup, term],
                path: path || mocksPath,
                root: dirname(path || mocksPath),
                multilineTermDefinitions: true,
                ...opts,
            });
            return html;
        };

        test('Should consume multiline content across blank lines for multiple terms', () => {
            const inputPath = resolve(__dirname, './mocks/term/multiline-basic.md');
            const input = readFileSync(inputPath, 'utf8');
            const result = transformMultiline(input, inputPath);

            expect(result).toContain('term-key=":api"');
            expect(result).toContain('term-key=":sdk"');
            expect(result).toContain('id=":api_element"');
            expect(result).toContain('id=":sdk_element"');
            expect(result).toContain('REST API');
            expect(result).toContain('GraphQL API');
            expect(result).toContain('gRPC');
            expect(clearRandomId(result)).toMatchSnapshot();
        });

        test('Should consume all content until EOF for a single term', () => {
            const inputPath = resolve(__dirname, './mocks/term/multiline-single.md');
            const input = readFileSync(inputPath, 'utf8');
            const result = transformMultiline(input, inputPath);

            expect(result).toContain('term-key=":api"');
            expect(result).toContain('id=":api_element"');
            expect(result).toContain('Extra details');
            expect(result).toContain('More information follows');
            expect(clearRandomId(result)).toMatchSnapshot();
        });

        test('Should NOT consume multiline content when option is disabled (backward compat)', () => {
            const inputPath = resolve(__dirname, './mocks/term/multiline-basic.md');
            const input = readFileSync(inputPath, 'utf8');

            const resultDefault = transformYfm(input, inputPath);
            const resultMultiline = transformMultiline(input, inputPath);

            const apiDfnRe = /id=":api_element"[^]*?<\/dfn>/;

            const apiDfnDefault = resultDefault.match(apiDfnRe)?.[0] ?? '';
            const apiDfnMultiline = resultMultiline.match(apiDfnRe)?.[0] ?? '';

            expect(apiDfnDefault).not.toContain('gRPC');
            expect(apiDfnMultiline).toContain('gRPC');
        });

        test('Should handle single-line term definitions the same as before', () => {
            const input = [
                '# Hello',
                '',
                'The [HTML](*html) spec.',
                '',
                '[*html]: HyperText Markup Language',
            ].join('\n');

            const resultDefault = transformYfm(input);
            const resultMultiline = transformMultiline(input);

            expect(resultDefault).toContain('id=":html_element"');
            expect(resultMultiline).toContain('id=":html_element"');
            expect(resultDefault).toContain('term-key=":html"');
            expect(resultMultiline).toContain('term-key=":html"');
        });
    });

    test('Should keep term definition when reference is inside a page-constructor block', () => {
        const pcPlugin = (md: MarkdownIt) => {
            md.core.ruler.before('termReplace', 'mock_page_constructor', (state: StateCore) => {
                const token = new state.Token('yfm_page-constructor', 'div', 0);
                token.content = 'title: The [HTML](*html) specification';
                state.tokens.push(token);
            });
        };

        const input = [
            '[*html]: The HyperText Markup Language.',
            '',
            '[*unused]: Never referenced.',
            '',
            '# Test',
            '',
            'No direct term references here.',
        ].join('\n');

        const {
            result: {html},
        } = transform(input, {
            plugins: [term, pcPlugin],
            path: mocksPath,
            root: dirname(mocksPath),
        });

        expect(html).toContain('id=":html_element"');
        expect(html).not.toContain('id=":unused_element"');
    });

    test('Should keep term definition referenced transitively through another term definition', () => {
        const inputPath = resolve(__dirname, './mocks/term/transitive-term.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toContain('id=":html_element"');
        expect(result).toContain('id=":css_element"');
        expect(result).not.toContain('id=":unused_element"');
        expect(clearRandomId(result)).toMatchSnapshot();
    });
});
