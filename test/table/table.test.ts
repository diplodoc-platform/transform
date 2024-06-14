import transform from '../../src/transform';
import table from '../../src/transform/plugins/table';
import includes from '../../src/transform/plugins/includes';

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
