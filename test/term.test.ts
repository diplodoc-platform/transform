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

        expect(clearRandomId(result)).toEqual(
            '<h1>Web</h1>\n' +
                '<p>The <i class="yfm yfm-term_title" term-key=":html" aria-describedby=":html_element" id="">HTML</i> specification</p>\n' +
                '<template id=":html_template"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>\n' +
                '</dfn></template>',
        );
    });

    test('Should create term in table with definition template', () => {
        const inputPath = resolve(__dirname, './mocks/term/table.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toEqual(
            '<h1>Web</h1>\n' +
                '<table>\n' +
                '<thead>\n' +
                '<tr>\n' +
                '<th>Language</th>\n' +
                '<th style="text-align:center">Initial release</th>\n' +
                '</tr>\n' +
                '</thead>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td><i class="yfm yfm-term_title" term-key=":html" aria-describedby=":html_element" id="">HTML</i></td>\n' +
                '<td style="text-align:center">1993</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n' +
                '<template id=":html_template"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>\n' +
                '</dfn></template>',
        );
    });

    test('Should create term in code with definition template', () => {
        const inputPath = resolve(__dirname, './mocks/term/code.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toEqual(
            '<h1>Web</h1>\n' +
                '\n' +
                '    <div class="yfm-clipboard">\n' +
                '    <pre><code class="hljs"><i class="yfm yfm-term_title" term-key=":html" id="">HTML</i>: Lorem\n' +
                '</code></pre>\n' +
                '\n' +
                '    <svg width="16" height="16" viewBox="0 0 24 24" class="yfm-clipboard-button" data-animation="3">\n' +
                '        <path\n' +
                '            fill="currentColor"\n' +
                '            d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"\n' +
                '        />\n' +
                '        <path\n' +
                '            stroke="currentColor"\n' +
                '            fill="transparent"\n' +
                '            strokeWidth="1.5"\n' +
                '            d="M9.5 13l3 3l5 -5"\n' +
                '            visibility="hidden"\n' +
                '        >\n' +
                '            <animate\n' +
                '                id="visibileAnimation-3"\n' +
                '                attributeName="visibility"\n' +
                '                from="hidden"\n' +
                '                to="visible"\n' +
                '                dur="0.2s"\n' +
                '                fill="freeze"\n' +
                '                begin=""\n' +
                '            />\n' +
                '            <animate\n' +
                '                id="hideAnimation-3"\n' +
                '                attributeName="visibility"\n' +
                '                from="visible"\n' +
                '                to="hidden"\n' +
                '                dur="1s"\n' +
                '                begin="visibileAnimation-3.end+1"\n' +
                '                fill="freeze"\n' +
                '            />\n' +
                '        </path>\n' +
                '    </svg>\n' +
                '    </div>\n' +
                '<template id=":html_template"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>\n' +
                '</dfn></template>',
        );
    });

    test('Term should use content from include', () => {
        const inputPath = resolve(__dirname, './mocks/term/includeContent.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toEqual(
            '<h1>Web</h1>\n' +
                '<p>The <i class="yfm yfm-term_title" term-key=":html" aria-describedby=":html_element" id="">HTML</i> specification</p>\n' +
                '<template id=":html_template"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>\n' +
                '</dfn></template>',
        );
    });
});
