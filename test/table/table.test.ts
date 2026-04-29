import type {YfmTablePluginOptions} from '../../src/transform/plugins/table/types';

import dd from 'ts-dedent';
import MarkdownIt from 'markdown-it';

import transform from '../../src/transform';
import table from '../../src/transform/plugins/table';
import includes from '../../src/transform/plugins/includes';
import {log} from '../../src/transform/log';

const transformYfm = (text: string, opts?: YfmTablePluginOptions) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [table],
        enableMarkdownAttrs: false,
        ...opts,
    });
    return html;
};

describe('Table plugin', () => {
    it('should render simple inline table', () => {
        expect(transformYfm('#|\n||1|2||\n||3|4||\n|#')).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>3</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>4</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should render simple table', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '||Cell in column 1, row 1\n' +
                    '|Cell in column 2, row 1||\n' +
                    '||Cell in column 1, row 2\n' +
                    '|Cell in column 2, row 2||\n' +
                    '||Cell in column 1, row 3\n' +
                    '|Cell in column 2, row 3||\n' +
                    '|#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 1</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 2</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 3</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 3</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should render simple table with attrs', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '||Cell in column 1, row 1\n' +
                    '|Cell in column 2, row 1||\n' +
                    '||Cell in column 1, row 2\n' +
                    '|Cell in column 2, row 2||\n' +
                    '||Cell in column 1, row 3\n' +
                    '|Cell in column 2, row 3||\n' +
                    '|# {.test .name #id data-diplodoc-large-table data-wide-preview="true"}',
            ),
        ).toBe(
            '<table class="test name" id="id" data-wide-preview="true" data-diplodoc-large-table="true">\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 1</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 2</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 3</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 3</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should render table between paragraphs', () => {
        expect(
            transformYfm(
                'Text\n' +
                    '\n' +
                    '#|\n' +
                    '||Cell in column 1, row 1\n' +
                    '|Cell in column 2, row 1||\n' +
                    '||Cell in column 1, row 2\n' +
                    '|Cell in column 2, row 2||\n' +
                    '|#\n' +
                    '\n' +
                    'Text',
            ),
        ).toBe(
            '<p>Text</p>\n' +
                '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 1</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 2</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n' +
                '<p>Text</p>\n',
        );
    });
    it('should render table with inline elements', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '||**bold**\n' +
                    '|_italic_||\n' +
                    '||_**bold and italic**_\n' +
                    '|`code snippet`||\n' +
                    '|| ![alt text](image.png)\n' +
                    '| [link to README.md](README.md)||\n' +
                    '|#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p><strong>bold</strong></p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p><em>italic</em></p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p><em><strong>bold and italic</strong></em></p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p><code>code snippet</code></p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p><img src="image.png" alt="alt text" /></p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p><a href="README.md">link to README.md</a></p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should render table with block elements', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '||Text with\n' +
                    'new line\n' +
                    '|- Element 1\n' +
                    '- Element 2\n' +
                    '- Element 3\n' +
                    '- Element 4||\n' +
                    '||\n' +
                    '- Element 1\n' +
                    '   - Element A\n' +
                    '   - Element B\n' +
                    '- Element 2\n' +
                    'test||\n' +
                    '|| test\n' +
                    '# h1\n' +
                    'test\n' +
                    '|test||\n' +
                    '|#\n',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Text with<br />\n' +
                'new line</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<ul>\n' +
                '<li>Element 1</li>\n' +
                '<li>Element 2</li>\n' +
                '<li>Element 3</li>\n' +
                '<li>Element 4</li>\n' +
                '</ul>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<ul>\n' +
                '<li>Element 1\n' +
                '<ul>\n' +
                '<li>Element A</li>\n' +
                '<li>Element B</li>\n' +
                '</ul>\n' +
                '</li>\n' +
                '<li>Element 2<br />\n' +
                'test</li>\n' +
                '</ul>\n' +
                '</td>\n' +
                '<td></td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>test</p>\n' +
                '<h1>h1</h1>\n' +
                '<p>test</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>test</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should render two tables', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '|| 1\n' +
                    '| 2||\n' +
                    '|| 3\n' +
                    '| 4||\n' +
                    '|#\n' +
                    '\n' +
                    '#|\n' +
                    '|| 5\n' +
                    '| 6||\n' +
                    '|| 7\n' +
                    '| 8||\n' +
                    '|#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>3</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>4</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n' +
                '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>5</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>6</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>7</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>8</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should not render table inside code', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '|| 1\n' +
                    '|\n' +
                    '```\n' +
                    '#|\n' +
                    '|| 4\n' +
                    '| 5||\n' +
                    '\n' +
                    '|| 6\n' +
                    '| 7||\n' +
                    '|#\n' +
                    '```||\n' +
                    '|| 2\n' +
                    '| 3||\n' +
                    '|#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<pre><code class="hljs">#|\n' +
                '|| 4\n' +
                '| 5||\n' +
                '\n' +
                '|| 6\n' +
                '| 7||\n' +
                '|#\n' +
                '</code></pre>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>2</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>3</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should not render table without close token', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '||Cell in column 1, row 1\n' +
                    '|Cell in column 2, row 1||\n' +
                    '||Cell in column 1, row 2\n' +
                    '|Cell in column 2, row 2||\n' +
                    '||Cell in column 1, row 3\n' +
                    '|Cell in column 2, row 3||',
            ),
        ).toBe(
            '<p>#|<br />\n' +
                '||Cell in column 1, row 1<br />\n' +
                '|Cell in column 2, row 1||<br />\n' +
                '||Cell in column 1, row 2<br />\n' +
                '|Cell in column 2, row 2||<br />\n' +
                '||Cell in column 1, row 3<br />\n' +
                '|Cell in column 2, row 3||</p>\n',
        );
    });
    it('should not render table without open token', () => {
        expect(
            transformYfm(
                '||Cell in column 1, row 1\n' +
                    '|Cell in column 2, row 1\n' +
                    '||Cell in column 1, row 2\n' +
                    '|Cell in column 2, row 2\n' +
                    '|#\n' +
                    '\n' +
                    'Test',
            ),
        ).toBe(
            '<p>||Cell in column 1, row 1<br />\n' +
                '|Cell in column 2, row 1<br />\n' +
                '||Cell in column 1, row 2<br />\n' +
                '|Cell in column 2, row 2<br />\n' +
                '|#</p>\n' +
                '<p>Test</p>\n',
        );
    });
    it('should not render table if no empty line before table', () => {
        expect(
            transformYfm(
                'Test\n' +
                    '#|\n' +
                    '||Cell in column 1, row 1\n' +
                    '|Cell in column 2, row 1||\n' +
                    '\n' +
                    '||Cell in column 1, row 2\n' +
                    '|Cell in column 2, row 2||\n' +
                    '|#',
            ),
        ).toBe(
            '<p>Test<br />\n' +
                '#|<br />\n' +
                '||Cell in column 1, row 1<br />\n' +
                '|Cell in column 2, row 1||</p>\n' +
                '<p>||Cell in column 1, row 2<br />\n' +
                '|Cell in column 2, row 2||<br />\n' +
                '|#</p>\n',
        );
    });
    it('should render table inside table', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '|| 1\n' +
                    '|\n' +
                    '\n' +
                    'test\n' +
                    '\n' +
                    '#|\n' +
                    '|| 5\n' +
                    '| 6||\n' +
                    '|| 7\n' +
                    '| 8||\n' +
                    '|#\n' +
                    '\n' +
                    'test||\n' +
                    '|| 3\n' +
                    '| 4||\n' +
                    '|#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>test</p>\n' +
                '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>5</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>6</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>7</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>8</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n' +
                '<p>test</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>3</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>4</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });

    it('should render table inside table 2', () => {
        expect(
            transformYfm(dd`
            #|
            ||

            #|
            ||

            table2

            ||
            |#

            ||
            |#
            `),
        ).toBe(dd`
            <table>
            <tbody>
            <tr>
            <td>
            <table>
            <tbody>
            <tr>
            <td>
            <p>table2</p>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            
            `);
    });

    it('should render table inside table inside table', () => {
        expect(
            transformYfm(dd`
            #|
            ||

            #|
            ||

            #|
            ||

            table3

            ||
            |#

            ||
            |#

            ||
            |#
            `),
        ).toBe(dd`
            <table>
            <tbody>
            <tr>
            <td>
            <table>
            <tbody>
            <tr>
            <td>
            <table>
            <tbody>
            <tr>
            <td>
            <p>table3</p>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            </td>
            </tr>
            </tbody>
            </table>
            
            `);
    });

    it('should render table with spaces after new line', () => {
        expect(
            transformYfm(
                '   #|\n' +
                    '  || row 1 col 1\n' +
                    '   | row 1 col 2||\n' +
                    '  || row 2 col 1\n' +
                    ' | row 2 col 2 ||\n' +
                    '    |#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>row 1 col 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>row 1 col 2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>row 2 col 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>row 2 col 2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should add empty cells', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '|| row 1 col 1\n' +
                    '| row 1 col 2||\n' +
                    '|| row 2 col 1\n' +
                    '| row 2 col 2||\n' +
                    '|| row 3 col 1\n' +
                    '| row 3 col 2\n' +
                    '| row 3 col 3||\n' +
                    '|#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>row 1 col 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>row 1 col 2</p>\n' +
                '</td>\n' +
                '<td></td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>row 2 col 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>row 2 col 2</p>\n' +
                '</td>\n' +
                '<td></td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>row 3 col 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>row 3 col 2</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>row 3 col 3</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should render table inside quote on each line', () => {
        expect(
            transformYfm(
                '> #|\n' +
                    '> ||Cell in column 1, row 1\n' +
                    '> |Cell in column 2, row 1||\n' +
                    '> ||Cell in column 1, row 2\n' +
                    '> |Cell in column 2, row 2||\n' +
                    '> ||Cell in column 1, row 3\n' +
                    '> |Cell in column 2, row 3||\n' +
                    '> |#',
            ),
        ).toBe(
            '<blockquote>\n' +
                '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 1</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 2</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Cell in column 1, row 3</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Cell in column 2, row 3</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n' +
                '</blockquote>\n',
        );
    });
    it('should correct render escaped cells', () => {
        expect(transformYfm('#|\n||1 \\| 1.1|2||\n||3|4||\n|#')).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>1 | 1.1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>3</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>4</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
    it('should correct render escaped rows', () => {
        expect(
            transformYfm(
                '#|\n' +
                    '|| cell text \\|| cell text ||\n' +
                    '|| cell text | cell text ||\n' +
                    '|#',
            ),
        ).toBe(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>cell text |</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>cell text</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>cell text</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>cell text</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });

    it('should ignore pipe in code-block', () => {
        expect(
            transformYfm(dd`
            #|
            ||
            \`\`\`
            before | after
            \`\`\`
            ||
            |#
            `),
        ).toBe(dd`
            <table>
            <tbody>
            <tr>
            <td>
            <pre><code class="hljs">before | after
            </code></pre>
            </td>
            </tr>
            </tbody>
            </table>

            `);
    });

    describe('table_ignoreSplittersInBlockCode=false', () => {
        it('should split cells by pipe in code-block', () => {
            expect(
                transformYfm(
                    dd`
                #|
                ||
                \`\`\`
                before | after
                \`\`\`
                ||
                |#
                `,
                    {table_ignoreSplittersInBlockCode: false},
                ),
            ).toBe(dd`
                <table>
                <tbody>
                <tr>
                <td>
                <pre><code class="hljs">before |</code></pre>
                </td>
                <td>
                <p>after</p>
                <pre><code class="hljs">|</code></pre>
                </td>
                </tr>
                </tbody>
                </table>

                `);
        });
    });

    it('should split cells by pipe in inline-code', () => {
        expect(
            transformYfm(dd`
            #|
            || code \`before|after\` code ||
            |#
            `),
        ).toBe(dd`
            <table>
            <tbody>
            <tr>
            <td>
            <p>code \`before</p>
            </td>
            <td>
            <p>after\` code</p>
            </td>
            </tr>
            </tbody>
            </table>

            `);
    });

    describe('table_ignoreSplittersInInlineCode=true', () => {
        it('should ignore pipe in inline-code', () => {
            expect(
                transformYfm(
                    dd`
                #|
                || code \`before|after\` code ||
                |#
                `,
                    {table_ignoreSplittersInInlineCode: true},
                ),
            ).toBe(dd`
                <table>
                <tbody>
                <tr>
                <td>
                <p>code <code>before|after</code> code</p>
                </td>
                </tr>
                </tbody>
                </table>

                `);
        });

        it('should split cells by pipe in escaped inline-code', () => {
            expect(
                transformYfm(
                    dd`
                #|
                || code \\\`before|after\` code ||
                |#
                `,
                    {table_ignoreSplittersInInlineCode: true},
                ),
            ).toBe(dd`
                <table>
                <tbody>
                <tr>
                <td>
                <p>code \`before</p>
                </td>
                <td>
                <p>after\` code</p>
                </td>
                </tr>
                </tbody>
                </table>

                `);
        });
    });

    it('should split cells by pipe in math-block', () => {
        expect(
            transformYfm(dd`
            #|
            ||
            $$
            before | after
            $$
            ||
            |#
            `),
        ).toBe(dd`
            <table>
            <tbody>
            <tr>
            <td>
            <p>$$<br />
            before</p>
            </td>
            <td>
            <p>after<br />
            $$</p>
            </td>
            </tr>
            </tbody>
            </table>

            `);
    });

    describe('table_ignoreSplittersInBlockMath=true', () => {
        it('should ignore pipe in math-block', () => {
            expect(
                transformYfm(
                    dd`
                #|
                ||
                $$
                before | after
                $$
                ||
                |#
                `,
                    {table_ignoreSplittersInBlockMath: true},
                ),
            ).toBe(dd`
                <table>
                <tbody>
                <tr>
                <td>
                <p>$$<br />
                before | after<br />
                $$</p>
                </td>
                </tr>
                </tbody>
                </table>

                `);
        });
    });

    it('should split cells by pipe in inline-math', () => {
        expect(
            transformYfm(dd`
            #|
            || math $before|after$ math ||
            |#
            `),
        ).toBe(dd`
            <table>
            <tbody>
            <tr>
            <td>
            <p>math $before</p>
            </td>
            <td>
            <p>after$ math</p>
            </td>
            </tr>
            </tbody>
            </table>

            `);
    });

    describe('table_ignoreSplittersInInlineMath=true', () => {
        it('should ignore pipe in inline-math', () => {
            expect(
                transformYfm(
                    dd`
                #|
                || math $before\\$|\\$after$ math ||
                |#
                `,
                    {table_ignoreSplittersInInlineMath: true},
                ),
            ).toBe(dd`
                <table>
                <tbody>
                <tr>
                <td>
                <p>math $before$|$after$ math</p>
                </td>
                </tr>
                </tbody>
                </table>

                `);
        });

        it('should split cells by pipe in escaped inline-math', () => {
            expect(
                transformYfm(
                    dd`
                #|
                || math \\$before|after$ math ||
                |#
                `,
                    {table_ignoreSplittersInInlineMath: true},
                ),
            ).toBe(dd`
                <table>
                <tbody>
                <tr>
                <td>
                <p>math $before</p>
                </td>
                <td>
                <p>after$ math</p>
                </td>
                </tr>
                </tbody>
                </table>

                `);
        });
    });

    it('should split cells by pipe in multiline content', () => {
        expect(
            transformYfm(dd`
            #|
            ||

            one

            two | three

            four

            ||
            |#
            `),
        ).toBe(dd`
            <table>
            <tbody>
            <tr>
            <td>
            <p>one</p>
            <p>two</p>
            </td>
            <td>
            <p>three</p>
            <p>four</p>
            </td>
            </tr>
            </tbody>
            </table>

            `);
    });

    it('parses table with liquid variables inside', () => {
        const actual = transformYfm(
            '#|\n' +
                '|| {{variable | length}} column 1, row 1\n' +
                '|Cell in column 2, row 1||\n' +
                '||Cell in column 1, row 2\n' +
                '|Cell in column 2, row 2||\n' +
                '|#',
        );
        expect(actual).toMatchSnapshot();
    });

    describe('rowspans', () => {
        it('should add rowspan for marked cells', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 ||\n' +
                        '|| Text here | Text there  ||\n' +
                        '|| ^ | More text ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td rowspan="2">\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('should work without whitespace', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 ||\n' +
                        '|| Text here | Text there  ||\n' +
                        '||^| More text ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td rowspan="2">\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('consecutive rowspans should apply to correct cell', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 ||\n' +
                        '|| Text here | Text there  ||\n' +
                        '|| ^ | More text ||\n' +
                        '|| ^ | Even more text ||\n' +
                        '|| ^ | Some more text ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td rowspan="4">\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Even more text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Some more text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('multiple row spans in a table should work correctly', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 | Heading3||\n' +
                        '|| Text here | Text there | Text even here ||\n' +
                        '|| ^ | More text | ^ ||\n' +
                        '|| Another rowspan | Even more text | Out of example ideas||\n' +
                        '|| ^ | Some more text | Test  ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading3</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td rowspan="2">\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '<td rowspan="2">\n' +
                    '<p>Text even here</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td rowspan="2">\n' +
                    '<p>Another rowspan</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Even more text</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Out of example ideas</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Some more text</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Test</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });
    });

    describe('colspans', () => {
        it('should add colspans for marked cells', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 ||\n' +
                        '|| Text here | Text there  ||\n' +
                        '|| More text | > ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td colspan="2">\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('should work without whitespace', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 ||\n' +
                        '|| Text here | Text there  ||\n' +
                        '|| More text |>||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td colspan="2">\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('should work for consecutive colspans', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 | Heading3 ||\n' +
                        '|| Text here | Text there | Some text||\n' +
                        '|| More text | > | > ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading3</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Some text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td colspan="3">\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });
    });

    describe('rowspan and colspan together', () => {
        it('should correctly handle a case when rowspan and callspan are used together', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 | Heading3 ||\n' +
                        '|| Text here | > | Some text||\n' +
                        '|| ^ | > | Other text ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading3</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td colspan="2" rowspan="2">\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Some text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Other text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('should not throw on span mismatch', () => {
            expect(() =>
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 | Heading3 ||\n' +
                        '|| Text here | > | Some text||\n' +
                        '|| ^ | more text | Other text ||\n' +
                        '|#',
                ),
            ).not.toThrow();
        });

        it('spans in the middle', () => {
            expect(
                transformYfm(
                    '#|\n' +
                        '|| Heading1  | Heading2 | Heading3 | Heading4 ||\n' +
                        '|| Text here | Spanned | > | More text ||\n' +
                        '|| Text there | ^ | > | More text ||\n' +
                        '|#',
                ),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading3</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading4</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Text here</p>\n' +
                    '</td>\n' +
                    '<td colspan="2" rowspan="2">\n' +
                    '<p>Spanned</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Text there</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('should correctly apply a row span after a mixed span', () => {
            expect(
                transformYfm(`#|
|| Heading1  | Heading2 | Heading3 ||
|| Text | > | Text ||
|| ^ | > | ^ ||
|#`),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading3</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td colspan="2" rowspan="2">\n' +
                    '<p>Text</p>\n' +
                    '</td>\n' +
                    '<td rowspan="2">\n' +
                    '<p>Text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr></tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });
    });

    it('should allow to escape colspan and rowspan and render symbols as is', () => {
        expect(
            transformYfm(`#|
|| Heading1  | Heading2 ||
|| \\> | \\^  ||
|#`),
        ).toEqual(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>Heading1</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>Heading2</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>&gt;</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>^</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });

    describe('edge cases', () => {
        it('colspan in the first cell should not throw', () => {
            expect(() =>
                transformYfm(
                    `#|
|| >  | Text here ||
|| More text | Some more text ||
|#`,
                ),
            ).not.toThrow();
        });

        it('rowspan in the first row should not throw', () => {
            expect(() =>
                transformYfm(
                    `#|
|| Text here  | ^ ||
|| More text | Some more text ||
|#`,
                ),
            ).not.toThrow();
        });

        it('two edge cases together should not throw', () => {
            expect(() =>
                transformYfm(
                    `#|
|| ^  | > ||
|| More text | Some more text ||
|#`,
                ),
            ).not.toThrow();
        });
    });

    it('two edge cases together should not throw', () => {
        expect(() =>
            transformYfm(
                `#|
|| ^  | > ||
|| More text | Some more text ||
|#`,
            ),
        ).not.toThrow();
    });

    describe('with attrs', () => {
        it('should correctly add classes to table cell', () => {
            expect(
                transformYfm(`#|
|| Heading1 | Heading2 | Heading3 | Heading4 ||
|| Text | Text {.cell-align-center} | > | More text ||
|#`),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading3</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading4</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Text</p>\n' +
                    '</td>\n' +
                    '<td class="cell-align-center" colspan="2">\n' +
                    '<p>Text</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>More text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });

        it('should correctly apply classes in case of last table cell in the row', () => {
            expect(
                transformYfm(`#|
|| Heading1 | Heading2  ||
|| Text {.cell-align-center} | > ||
|#`),
            ).toEqual(
                '<table>\n' +
                    '<tbody>\n' +
                    '<tr>\n' +
                    '<td>\n' +
                    '<p>Heading1</p>\n' +
                    '</td>\n' +
                    '<td>\n' +
                    '<p>Heading2</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '<tr>\n' +
                    '<td class="cell-align-center" colspan="2">\n' +
                    '<p>Text</p>\n' +
                    '</td>\n' +
                    '</tr>\n' +
                    '</tbody>\n' +
                    '</table>\n',
            );
        });
    });
});

const mocksPath = require.resolve('../utils.ts');

const transformWithIncludes = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [table, includes],
        path: mocksPath,
        enableMarkdownAttrs: false,
    });
    return html;
};

describe('table with includes', () => {
    it('should preserve include paths', () => {
        expect(
            transformWithIncludes(
                '#|\n' +
                    '|| **Table people** | **Table social_card** ||\n' +
                    '||\n' +
                    '\n' +
                    '\n' +
                    '{% include [create-folder](./mocks/include.md) %}\n' +
                    '\n' +
                    '|\n' +
                    '\n' +
                    '{% include [create-folder](./mocks/include.md) %}\n' +
                    '\n' +
                    '||\n' +
                    '|#',
            ),
        ).toEqual(
            '<table>\n' +
                '<tbody>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p><strong>Table people</strong></p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p><strong>Table social_card</strong></p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '<tr>\n' +
                '<td>\n' +
                '<p>{% include <a href="./mocks/include.md">create-folder</a> %}</p>\n' +
                '</td>\n' +
                '<td>\n' +
                '<p>{% include <a href="./mocks/include.md">create-folder</a> %}</p>\n' +
                '</td>\n' +
                '</tr>\n' +
                '</tbody>\n' +
                '</table>\n',
        );
    });
});

describe('table attrs', () => {
    const parseTokens = (text: string, opts?: YfmTablePluginOptions) => {
        const md = new MarkdownIt();
        md.use(table, opts ?? {});
        return md.parse(text, {});
    };

    const findToken = (tokens: ReturnType<typeof parseTokens>, type: string) =>
        tokens.find((t: {type: string}) => t.type === type);

    it('parses single |:{key="value"} line into rawAttrs on yfm_table_open', () => {
        const tokens = parseTokens('#|\n|:{key="value"}\n||A||\n|#');
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.meta?.rawAttrs).toEqual({key: 'value'});
    });

    it('later |:{...} lines override earlier ones for same key', () => {
        const tokens = parseTokens('#|\n|:{key="first"}\n|:{key="second"}\n||A||\n|#');
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.meta?.rawAttrs).toEqual({key: 'second'});
    });

    it('empty |:{} results in rawAttrs === {}', () => {
        const tokens = parseTokens('#|\n|:{}\n||A||\n|#');
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.meta?.rawAttrs).toEqual({});
    });

    it('no attr lines results in rawAttrs === {}', () => {
        const tokens = parseTokens('#|\n||A||\n|#');
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.meta?.rawAttrs).toEqual({});
    });

    it('|:{...} attrs do not appear in generated HTML', () => {
        const html = transformYfm('#|\n|:{key="value"}\n||A||\n|#');
        expect(html).not.toContain('|:{');
        expect(html).not.toContain('key="value"');
        expect(html).not.toContain('key=&quot;value&quot;');
        expect(html).toContain('<table>');
    });

    it('duplicate key in single |:{...} line — last value wins', () => {
        const tokens = parseTokens('#|\n|:{key="first" key="second"}\n||A||\n|#');
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.meta?.rawAttrs).toEqual({key: 'second'});
    });
});

describe('row attrs', () => {
    const parseTokens = (text: string, opts?: YfmTablePluginOptions) => {
        const md = new MarkdownIt();
        md.use(table, opts ?? {});
        return md.parse(text, {});
    };

    const findTokens = (tokens: ReturnType<typeof parseTokens>, type: string) =>
        tokens.filter((t: {type: string}) => t.type === type);

    it('||:{key="value"} sets rawAttrs on yfm_tr_open', () => {
        const tokens = parseTokens('#|\n||:{key="value"} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        expect(trOpen?.meta?.rawAttrs).toEqual({key: 'value'});
    });

    it('||:{} sets empty rawAttrs on yfm_tr_open', () => {
        const tokens = parseTokens('#|\n||:{} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        expect(trOpen?.meta?.rawAttrs).toEqual({});
    });

    it('|| without attrs sets empty rawAttrs', () => {
        const tokens = parseTokens('#|\n|| A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        expect(trOpen?.meta?.rawAttrs).toEqual({});
    });

    it('multiple rows each get their own rawAttrs', () => {
        const tokens = parseTokens('#|\n||:{r="1"} A ||\n||:{r="2"} B ||\n|#');
        const trOpens = findTokens(tokens, 'yfm_tr_open');
        expect(trOpens[0]?.meta?.rawAttrs).toEqual({r: '1'});
        expect(trOpens[1]?.meta?.rawAttrs).toEqual({r: '2'});
    });

    it('|| :{...} with space after || does not parse as row attrs', () => {
        const tokens = parseTokens('#|\n|| :{key="v"} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        expect(trOpen?.meta?.rawAttrs).toEqual({});
    });

    it('||:{...} on next line after || does not parse as row attrs', () => {
        const tokens = parseTokens('#|\n||\n:{key="v"} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        expect(trOpen?.meta?.rawAttrs).toEqual({});
    });

    it('||:{key="v"} does not leak :{...} into cell content HTML', () => {
        const html = transformYfm('#|\n||:{key="v"} A | B ||\n|#');
        expect(html).not.toContain(':{');
        expect(html).not.toContain('key=&quot;v&quot;');
        expect(html).toContain('<td>\n<p>A</p>\n</td>');
    });
});

describe('cell attrs', () => {
    const parseTokens = (text: string, opts?: YfmTablePluginOptions) => {
        const md = new MarkdownIt();
        md.use(table, opts ?? {});
        return md.parse(text, {});
    };

    const findTokens = (tokens: ReturnType<typeof parseTokens>, type: string) =>
        tokens.filter((t: {type: string}) => t.type === type);

    it('|::{key="v"} sets rawAttrs on second yfm_td_open', () => {
        const tokens = parseTokens('#|\n|| A |::{key="v"} B ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({});
        expect(tdOpens[1]?.meta?.rawAttrs).toEqual({key: 'v'});
    });

    it('||::{key="v"} sets rawAttrs on first yfm_td_open (no row attrs)', () => {
        const tokens = parseTokens('#|\n||::{key="v"} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(trOpen?.meta?.rawAttrs).toEqual({});
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({key: 'v'});
        expect(tdOpens[1]?.meta?.rawAttrs).toEqual({});
    });

    it('||:{r="1"} ::{c="1"} A sets both row and first-cell attrs', () => {
        const tokens = parseTokens('#|\n||:{r="1"} ::{c="1"} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(trOpen?.meta?.rawAttrs).toEqual({r: '1'});
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({c: '1'});
        expect(tdOpens[1]?.meta?.rawAttrs).toEqual({});
    });

    it('||:{r="1"}::{c="1"} A — no space between row and cell attrs', () => {
        const tokens = parseTokens('#|\n||:{r="1"}::{c="1"} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(trOpen?.meta?.rawAttrs).toEqual({r: '1'});
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({c: '1'});
    });

    it('||:{r="1"}   \t::{c="1"} A — multiple spaces/tabs between row and cell attrs', () => {
        const tokens = parseTokens('#|\n||:{r="1"}   \t::{c="1"} A | B ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(trOpen?.meta?.rawAttrs).toEqual({r: '1'});
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({c: '1'});
    });

    it('|| A |::{} B sets empty rawAttrs on second cell', () => {
        const tokens = parseTokens('#|\n|| A |::{} B ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[1]?.meta?.rawAttrs).toEqual({});
    });

    it('|| A | B — no cell attrs sets empty rawAttrs on all cells', () => {
        const tokens = parseTokens('#|\n|| A | B ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({});
        expect(tdOpens[1]?.meta?.rawAttrs).toEqual({});
    });

    it('| ::{k="v"} space before ::{ — does not parse as cell attrs for second cell', () => {
        const tokens = parseTokens('#|\n|| A | ::{k="v"} B ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[1]?.meta?.rawAttrs).toEqual({});
    });

    it('|| A |\\n::{k="v"} B — newline before ::{ does not parse as cell attrs', () => {
        const tokens = parseTokens('#|\n|| A |\n::{k="v"} B ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[1]?.meta?.rawAttrs).toEqual({});
    });

    it('||:{r="1"}\\n::{c="1"} — cell attrs on next line not parsed', () => {
        const tokens = parseTokens('#|\n||:{r="1"}\n::{c="1"} G | H ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({});
    });

    it('|::{...} does not leak ::{...} into cell content HTML', () => {
        const html = transformYfm('#|\n|| A |::{key="v"} B ||\n|#');
        expect(html).not.toContain('::{');
        expect(html).not.toContain('key=&quot;v&quot;');
        expect(html).toContain('<td>\n<p>B</p>\n</td>');
    });

    it('cell with ::{...} and colspan > works correctly', () => {
        const html = transformYfm('#|\n||::{k="v"} A | > ||\n|#');
        expect(html).toContain('colspan="2"');
        expect(html).not.toContain('::{');
    });

    it('::{k="v"} on colspan > cell — first cell gets rawAttrs, colspan applied', () => {
        const tokens = parseTokens('#|\n||::{k="v"} A |::{k2="v2"} > ||\n|#');
        // clearTokens removes the > cell from output tokens
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({k: 'v'});
        expect(tdOpens[0]?.attrGet('colspan')).toBe('2');
        // only 1 td_open survives after clearTokens removes the > cell
        expect(tdOpens).toHaveLength(1);
    });

    it('|| ::{k="v"} A — space before ::{ without row attrs does not parse as cell attrs', () => {
        const tokens = parseTokens('#|\n|| ::{k="v"} A ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({});
    });

    it('||:{r="1"} ::{c="1"} A — space before ::{ with row attrs parses correctly', () => {
        const tokens = parseTokens('#|\n||:{r="1"} ::{c="1"} A ||\n|#');
        const trOpen = findTokens(tokens, 'yfm_tr_open')[0];
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(trOpen?.meta?.rawAttrs).toEqual({r: '1'});
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({c: '1'});
    });

    it('||:{} ::{c="1"} A — empty row attrs syntax present, space before ::{ is allowed', () => {
        const tokens = parseTokens('#|\n||:{} ::{c="1"} A ||\n|#');
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({c: '1'});
    });
});

describe('cell align attribute', () => {
    const parseTokens = (text: string, opts?: YfmTablePluginOptions) => {
        const md = new MarkdownIt();
        md.use(table, opts ?? {});
        return md.parse(text, {});
    };

    it('align="center" adds cell-align-center class on td', () => {
        const tokens = parseTokens('#|\n||::{align="center"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('class')).toBe('cell-align-center');
    });

    it('align="top-left" adds cell-align-top-left class on td', () => {
        const tokens = parseTokens('#|\n||::{align="top-left"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('class')).toBe('cell-align-top-left');
    });

    it('align="unknown-value" adds class on td and emits warn', () => {
        const {
            result: {html},
            logs,
        } = transform('#|\n||::{align="unknown-value"} A ||\n|#', {
            plugins: [table],
            enableMarkdownAttrs: false,
        });
        expect(html).toContain('<td data-align="unknown-value" class="cell-align-unknown-value">');
        expect(logs.warn.some((w: string) => w.includes('Unknown table cell align value'))).toBe(
            true,
        );
    });

    it('align="center" with unknown key "class" — only align is applied, unknown keys ignored', () => {
        const tokens = parseTokens('#|\n||::{align="center" class="foo"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        const tdClass = tdOpens[0]?.attrGet('class') ?? '';
        expect(tdClass).toContain('cell-align-center');
        expect(tdClass).not.toContain('foo');
    });

    it('align does not appear as an HTML attribute on td', () => {
        const tokens = parseTokens('#|\n||::{align="center"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('align')).toBeNull();
    });
});

describe('deprecated cell-align class', () => {
    beforeEach(() => {
        log.clear();
    });

    it('|| Text {.cell-align-center} || emits deprecation warn and still applies class on td', () => {
        const {
            result: {html},
            logs,
        } = transform('#|\n|| Text {.cell-align-center} ||\n|#', {
            plugins: [table],
            enableMarkdownAttrs: false,
        });
        expect(html).toContain('<td class="cell-align-center">');
        expect(
            logs.warn.some((w: string) => w.includes('.cell-align-* class in cell content')),
        ).toBe(true);
    });

    it('|| Text {.other-class} || does not emit deprecation warn', () => {
        const {
            result: {html},
            logs,
        } = transform('#|\n|| Text {.other-class} ||\n|#', {
            plugins: [table],
            enableMarkdownAttrs: false,
        });
        expect(html).toContain('<td class="other-class">');
        expect(
            logs.warn.some((w: string) => w.includes('.cell-align-* class in cell content')),
        ).toBe(false);
    });
});

describe('cell bg attribute', () => {
    const parseTokens = (text: string, opts?: YfmTablePluginOptions) => {
        const md = new MarkdownIt();
        md.use(table, opts ?? {});
        return md.parse(text, {});
    };

    it('||::{bg="red"} A || sets meta.bg and meta.rawAttrs on yfm_td_open', () => {
        const tokens = parseTokens('#|\n||::{bg="red"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.meta?.bg).toBe('red');
        expect(tdOpens[0]?.meta?.rawAttrs).toEqual({bg: 'red'});
    });

    it('|| A || (no bg) — meta.bg is undefined', () => {
        const tokens = parseTokens('#|\n|| A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.meta?.bg).toBeUndefined();
    });

    it('adds cell-bg-<value> class on td token', () => {
        const tokens = parseTokens('#|\n||::{bg="red"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('class')).toBe('cell-bg-red');
    });

    it('adds data-bg="<value>" attribute on td token', () => {
        const tokens = parseTokens('#|\n||::{bg="red"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('data-bg')).toBe('red');
    });

    it('||::{bg=""} A || — empty value: only data-bg set, no cell-bg- class', () => {
        const tokens = parseTokens('#|\n||::{bg=""} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.meta?.bg).toBe('');
        expect(tdOpens[0]?.attrGet('data-bg')).toBe('');
        expect(tdOpens[0]?.attrGet('class') ?? '').not.toContain('cell-bg-');
    });

    it('bg + align: both classes present on td token', () => {
        const tokens = parseTokens('#|\n||::{bg="red" align="center"} A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        const cls = tdOpens[0]?.attrGet('class') ?? '';
        expect(cls).toContain('cell-align-center');
        expect(cls).toContain('cell-bg-red');
    });

    it('bg + deprecated {.cell-align-center}: both classes present on td', () => {
        const html = transformYfm('#|\n||::{bg="red"} A {.cell-align-center} ||\n|#');
        expect(html).toContain('cell-align-center');
        expect(html).toContain('cell-bg-red');
    });

    it('cells without bg are not affected', () => {
        const tokens = parseTokens('#|\n|| A ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('class')).toBeNull();
        expect(tdOpens[0]?.attrGet('data-bg')).toBeNull();
    });

    it('multiple cells with different bg values', () => {
        const tokens = parseTokens('#|\n||::{bg="red"} A |::{bg="blue"} B ||\n|#');
        const tdOpens = tokens.filter((t: {type: string}) => t.type === 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('class')).toBe('cell-bg-red');
        expect(tdOpens[0]?.attrGet('data-bg')).toBe('red');
        expect(tdOpens[1]?.attrGet('class')).toBe('cell-bg-blue');
        expect(tdOpens[1]?.attrGet('data-bg')).toBe('blue');
    });

    it('::{bg} does not leak into cell content HTML', () => {
        const html = transformYfm('#|\n||::{bg="red"} Text ||\n|#');
        expect(html).not.toContain('::{');
        expect(html).toContain('<p>Text</p>');
    });
});

describe('table header-rows attribute', () => {
    beforeEach(() => {
        log.clear();
    });

    const parseTokens = (text: string, opts?: YfmTablePluginOptions) => {
        const md = new MarkdownIt();
        md.use(table, opts ?? {});
        return md.parse(text, {});
    };

    const findTokens = (tokens: ReturnType<typeof parseTokens>, type: string) =>
        tokens.filter((t: {type: string}) => t.type === type);

    const findToken = (tokens: ReturnType<typeof parseTokens>, type: string) =>
        tokens.find((t: {type: string}) => t.type === type);

    // 3-row, 3-col table with header-rows="1"
    const table3x3 =
        '#|\n|:{header-rows="1"}\n|| A | B | C ||\n|| D | E | F ||\n|| G | H | I ||\n|#';

    it('first row cell-open tokens have tag="th", others have "td"', () => {
        const tokens = parseTokens(table3x3);
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.tag).toBe('th');
        expect(tdOpens[1]?.tag).toBe('th');
        expect(tdOpens[2]?.tag).toBe('th');
        expect(tdOpens[3]?.tag).toBe('td');
        expect(tdOpens[4]?.tag).toBe('td');
        expect(tdOpens[5]?.tag).toBe('td');
    });

    it('token.type stays yfm_td_open for all cells including header', () => {
        const tokens = parseTokens(table3x3);
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens.length).toBe(9);
    });

    it('header cell-open tokens have scope="col", body cells do not', () => {
        const tokens = parseTokens(table3x3);
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.attrGet('scope')).toBe('col');
        expect(tdOpens[1]?.attrGet('scope')).toBe('col');
        expect(tdOpens[2]?.attrGet('scope')).toBe('col');
        expect(tdOpens[3]?.attrGet('scope')).toBeNull();
    });

    it('cell-close tokens in header row have tag="th"', () => {
        const tokens = parseTokens(table3x3);
        const tdCloses = findTokens(tokens, 'yfm_td_close');
        expect(tdCloses[0]?.tag).toBe('th');
        expect(tdCloses[3]?.tag).toBe('td');
    });

    it('first yfm_tr_open has data-header="true", others do not', () => {
        const tokens = parseTokens(table3x3);
        const trOpens = findTokens(tokens, 'yfm_tr_open');
        expect(trOpens[0]!.attrGet('data-header')).toBe('true');
        expect(trOpens[1]!.attrGet('data-header')).toBeNull();
        expect(trOpens[2]!.attrGet('data-header')).toBeNull();
    });

    it('yfm_table_open has data-header-rows="1"', () => {
        const tokens = parseTokens(table3x3);
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.attrGet('data-header-rows')).toBe('1');
    });

    it('yfm_table_open.meta.headerRows === 1', () => {
        const tokens = parseTokens(table3x3);
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.meta?.headerRows).toBe(1);
    });

    it('header-rows="2" makes first 2 rows th, third row td', () => {
        const text =
            '#|\n|:{header-rows="2"}\n|| A | B | C ||\n|| D | E | F ||\n|| G | H | I ||\n|#';
        const tokens = parseTokens(text);
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        const trOpens = findTokens(tokens, 'yfm_tr_open');
        expect(tdOpens[0]?.tag).toBe('th');
        expect(tdOpens[5]?.tag).toBe('th');
        expect(tdOpens[6]?.tag).toBe('td');
        expect(trOpens[0]?.attrGet('data-header')).toBe('true');
        expect(trOpens[1]?.attrGet('data-header')).toBe('true');
        expect(trOpens[2]?.attrGet('data-header')).toBeNull();
    });

    it('header-rows + align: header cell has tag="th", scope="col", cell-align-center class', () => {
        const text =
            '#|\n|:{header-rows="1"}\n||::{align="center"} Name | Age ||\n|| Alice | 30 ||\n|#';
        const tokens = parseTokens(text);
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        expect(tdOpens[0]?.tag).toBe('th');
        expect(tdOpens[0]?.attrGet('scope')).toBe('col');
        expect(tdOpens[0]?.attrGet('class')).toContain('cell-align-center');
    });

    it('header-rows + deprecated {.cell-align-center}: tag="th", scope="col", class has cell-align-center', () => {
        const {
            result: {html},
        } = transform(
            '#|\n|:{header-rows="1"}\n|| A {.cell-align-center} | B ||\n|| C | D ||\n|#',
            {
                plugins: [table],
                enableMarkdownAttrs: false,
            },
        );
        expect(html).toContain('<th');
        expect(html).toContain('scope="col"');
        expect(html).toContain('cell-align-center');
    });

    it('clamp: header-rows="99" with 2 rows makes all cells th and both tr data-header, no warn', () => {
        const {
            result: {html},
            logs,
        } = transform('#|\n|:{header-rows="99"}\n|| A | B ||\n|| C | D ||\n|#', {
            plugins: [table],
            enableMarkdownAttrs: false,
        });
        expect(html).toContain('<th');
        expect(html).not.toContain('<td');
        expect(html).toContain('data-header="true"');
        expect(logs.warn.some((w: string) => w.includes('header-rows'))).toBe(false);
    });

    it('auto-generated empty cells in header row get tag="th" and scope="col"', () => {
        // row 1 has 2 cols, row 2 has 3 cols — row 1 gets padded to 3
        const text = '#|\n|:{header-rows="1"}\n|| A | B ||\n|| C | D | E ||\n|#';
        const tokens = parseTokens(text);
        const tdOpens = findTokens(tokens, 'yfm_td_open');
        // first 3 are header row (2 real + 1 auto-generated)
        expect(tdOpens[0]?.tag).toBe('th');
        expect(tdOpens[1]?.tag).toBe('th');
        expect(tdOpens[2]?.tag).toBe('th');
        expect(tdOpens[2]?.attrGet('scope')).toBe('col');
        // next 3 are body row
        expect(tdOpens[3]?.tag).toBe('td');
    });

    it('other rawAttrs are preserved alongside header-rows', () => {
        const text = '#|\n|:{header-rows="1" class="data-table"}\n|| A ||\n|#';
        const tokens = parseTokens(text);
        const tableOpen = findToken(tokens, 'yfm_table_open');
        expect(tableOpen?.meta?.rawAttrs).toEqual({'header-rows': '1', class: 'data-table'});
        expect(tableOpen?.attrGet('data-header-rows')).toBe('1');
    });

    // invalid values — warn + ignore
    const invalidCases: Array<[string, string]> = [
        ['0', 'header-rows="0"'],
        ['-1', 'header-rows="-1"'],
        ['abc', 'header-rows="abc"'],
        ['1.5', 'header-rows="1.5"'],
        ['3px', 'header-rows="3px"'],
        ['', 'header-rows=""'],
    ];

    it.each(invalidCases)(
        'header-rows="%s" is invalid: no th, no data-header-rows, warn emitted',
        (value) => {
            const {
                result: {html},
                logs,
            } = transform(`#|\n|:{header-rows="${value}"}\n|| A | B ||\n|| C | D ||\n|#`, {
                plugins: [table],
                enableMarkdownAttrs: false,
            });
            expect(html).not.toContain('<th');
            expect(html).not.toContain('data-header-rows');
            expect(html).not.toContain('data-header=');
            expect(
                logs.warn.some((w: string) => w.includes('Invalid table header-rows value')),
            ).toBe(true);
        },
    );

    it('table without header-rows: all cells td, no data-header-rows, no data-header, no warn', () => {
        const {
            result: {html},
            logs,
        } = transform('#|\n|| A | B ||\n|| C | D ||\n|#', {
            plugins: [table],
            enableMarkdownAttrs: false,
        });
        expect(html).not.toContain('<th');
        expect(html).not.toContain('data-header-rows');
        expect(html).not.toContain('data-header=');
        expect(logs.warn.some((w: string) => w.includes('header-rows'))).toBe(false);
    });
});
