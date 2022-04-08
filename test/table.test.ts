import transform from '../src/transform';
import table from '../src/transform/plugins/table';

const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [table],
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
                '<p><img src="image.png" alt="alt text"></p>\n' +
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
                '<p>Text with<br>\n' +
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
                '<li>Element 2<br>\n' +
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
            '\n' +
                '<p>#|<br>\n' +
                '||Cell in column 1, row 1<br>\n' +
                '|Cell in column 2, row 1||<br>\n' +
                '||Cell in column 1, row 2<br>\n' +
                '|Cell in column 2, row 2||<br>\n' +
                '||Cell in column 1, row 3<br>\n' +
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
            '<p>||Cell in column 1, row 1<br>\n' +
                '|Cell in column 2, row 1<br>\n' +
                '||Cell in column 1, row 2<br>\n' +
                '|Cell in column 2, row 2<br>\n' +
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
            '<p>Test<br>\n' +
                '#|<br>\n' +
                '||Cell in column 1, row 1<br>\n' +
                '|Cell in column 2, row 1||</p>\n' +
                '<p>||Cell in column 1, row 2<br>\n' +
                '|Cell in column 2, row 2||<br>\n' +
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
});
