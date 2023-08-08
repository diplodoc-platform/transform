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

        expect(clearRandomId(result)).toEqual(`\
<template id=":html_template" label="html"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>
</dfn></template><h1>Web</h1>
<p>The <i class="yfm yfm-term_title" term-key=":html" aria-describedby=":html_element" id="">HTML</i> specification</p>
`);
    });

    test('Should create term in table with definition template', () => {
        const inputPath = resolve(__dirname, './mocks/term/table.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toEqual(`\
<template id=":html_template" label="html"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>
</dfn></template><h1>Web</h1>
<table>
<thead>
<tr>
<th>Language</th>
<th style="text-align:center">Initial release</th>
</tr>
</thead>
<tbody>
<tr>
<td><i class="yfm yfm-term_title" term-key=":html" aria-describedby=":html_element" id="">HTML</i></td>
<td style="text-align:center">1993</td>
</tr>
</tbody>
</table>
`);
    });

    test('Should create term in code with definition template', () => {
        const inputPath = resolve(__dirname, './mocks/term/code.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toEqual(`\
<template id=":html_template" label="html"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>
</dfn></template><h1>Web</h1>

    <div class="yfm-clipboard">
    <pre><code class="hljs"><i class="yfm yfm-term_title" term-key=":html" id="">HTML</i>: Lorem
</code></pre>

    <svg width="16" height="16" viewBox="0 0 24 24" class="yfm-clipboard-button" data-animation="10">
        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"></path>
        <path stroke="currentColor" fill="transparent" stroke-width="1.5" d="M9.5 13l3 3l5 -5" visibility="hidden">
            <animate id="visibileAnimation-10" attributeName="visibility" from="hidden" to="visible" dur="0.2s" fill="freeze" begin></animate>
            <animate id="hideAnimation-10" attributeName="visibility" from="visible" to="hidden" dur="1s" begin="visibileAnimation-10.end+1" fill="freeze"></animate>
        </path>
    </svg>
    </div>
`);
    });

    test('Term should use content from include', () => {
        const inputPath = resolve(__dirname, './mocks/term/includeContent.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(clearRandomId(result)).toEqual(`\
<template id=":html_template" label="html"><dfn class="yfm yfm-term_dfn" id=":html_element" role="tooltip"><p>The HyperText Markup Language or <strong>HTML</strong> is the standard markup language for documents designed to be displayed in a web browser.</p>
</dfn></template><h1>Web</h1>
<p>The <i class="yfm yfm-term_title" term-key=":html" aria-describedby=":html_element" id="">HTML</i> specification</p>
`);
    });
});
