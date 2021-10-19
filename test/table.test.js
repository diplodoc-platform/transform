const transform = require('../lib');
const table = require('../lib/plugins/table');

const transformYfm = (text) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [table],
    });
    return html;
};

describe('Table plugin', () => {
    it('should render simple table', () => {
        expect(transformYfm(
            '|===\n' +
            '|Cell in column 1, row 1\n' +
            '|Cell in column 2, row 1\n' +
            '\n' +
            '|Cell in column 1, row 2\n' +
            '|Cell in column 2, row 2\n' +
            '\n' +
            '|Cell in column 1, row 3\n' +
            '|Cell in column 2, row 3\n' +
            '|===',
        )).toBe(
            '<table>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td>Cell in column 1, row 1</td>\n' +
            '<td>Cell in column 2, row 1</td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>Cell in column 1, row 2</td>\n' +
            '<td>Cell in column 2, row 2</td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>Cell in column 1, row 3</td>\n' +
            '<td>Cell in column 2, row 3</td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n',
        );
    });
    it('should render table between paragraphs', () => {
        expect(transformYfm(
            'Text\n' +
            '\n' +
            '|===\n' +
            '|Cell in column 1, row 1\n' +
            '|Cell in column 2, row 1\n' +
            '\n' +
            '|Cell in column 1, row 2\n' +
            '|Cell in column 2, row 2\n' +
            '|===\n' +
            '\n' +
            'Text',
        )).toBe(
            '<p>Text</p>\n' +
            '<table>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td>Cell in column 1, row 1</td>\n' +
            '<td>Cell in column 2, row 1</td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>Cell in column 1, row 2</td>\n' +
            '<td>Cell in column 2, row 2</td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n' +
            '<p>Text</p>\n',
        );
    });
    it('should render table with inline elements', () => {
        expect(transformYfm(
            '|===\n' +
            '|**bold**\n' +
            '|_italic_\n' +
            '\n' +
            '|_**bold and italic**_\n' +
            '|`code snippet`\n' +
            '\n' +
            '| ![alt text](image.png)\n' +
            '| [link to README.md](README.md)\n' +
            '|===',
        )).toBe(
            '<table>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td><strong>bold</strong></td>\n' +
            '<td><em>italic</em></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td><em><strong>bold and italic</strong></em></td>\n' +
            '<td><code>code snippet</code></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td><img src="image.png" alt="alt text"></td>\n' +
            '<td><a href="README.md">link to README.md</a></td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n',
        );
    });
    it('should render table with block elements', () => {
        expect(transformYfm(
            '|===\n' +
            '|Text with\n' +
            'new line\n' +
            '|- Element 1\n' +
            '- Element 2\n' +
            '- Element 3\n' +
            '- Element 4\n' +
            '\n' +
            '|\n' +
            '- Element 1\n' +
            '   - Element A\n' +
            '   - Element B\n' +
            '- Element 2\n' +
            '|Left column | Right column | Center column\n' +
            ':--- | ---: | :---:\n' +
            'Text | Text | Text\n' +
            '\n' +
            '| test\n' +
            '# h1\n' +
            'test\n' +
            '|test\n' +
            '|===\n',
        )).toBe(
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
            '<li>Element 2</li>\n' +
            '</ul>\n' +
            '</td>\n' +
            '<td>\n' +
            '<table>\n' +
            '<thead>\n' +
            '<tr>\n' +
            '<th style="text-align:left">Left column</th>\n' +
            '<th style="text-align:right">Right column</th>\n' +
            '<th style="text-align:center">Center column</th>\n' +
            '</tr>\n' +
            '</thead>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td style="text-align:left">Text</td>\n' +
            '<td style="text-align:right">Text</td>\n' +
            '<td style="text-align:center">Text</td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n' +
            '</td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>\n' +
            '<p>test</p>\n' +
            '<h1>h1</h1>\n' +
            '<p>test</p>\n' +
            '</td>\n' +
            '<td>test</td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n',
        );
    });
    it('should render two tables', () => {
        expect(transformYfm(
            '|===\n' +
            '| 1\n' +
            '| 2\n' +
            '\n' +
            '| 3\n' +
            '| 4\n' +
            '|===\n' +
            '|===\n' +
            '| 5\n' +
            '| 6\n' +
            '\n' +
            '| 7\n' +
            '| 8\n' +
            '|===',
        )).toBe(
            '<table>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td>1</td>\n' +
            '<td>2</td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>3</td>\n' +
            '<td>4</td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n' +
            '<table>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td>5</td>\n' +
            '<td>6</td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>7</td>\n' +
            '<td>8</td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n',
        );
    });
    it('should not render table inside code', () => {
        expect(transformYfm(
            '|===\n' +
            '| 1\n' +
            '|\n' +
            '```\n' +
            '|===\n' +
            '| 4\n' +
            '| 5\n' +
            '\n' +
            '| 6\n' +
            '| 7\n' +
            '|===\n' +
            '```\n' +
            '\n' +
            '| 2\n' +
            '| 3\n' +
            '|===',
        )).toBe(
            '<table>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td>1</td>\n' +
            '<td>\n' +
            '<pre><code>|===\n' +
            '| 4\n' +
            '| 5\n' +
            '\n' +
            '| 6\n' +
            '| 7\n' +
            '|===\n' +
            '</code></pre>\n' +
            '</td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>2</td>\n' +
            '<td>3</td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table>\n',
        );
    });
    it('should not render table without close token', () => {
        expect(transformYfm(
            '|===\n' +
            '|Cell in column 1, row 1\n' +
            '|Cell in column 2, row 1\n' +
            '\n' +
            '|Cell in column 1, row 2\n' +
            '|Cell in column 2, row 2\n' +
            '\n' +
            '|Cell in column 1, row 3\n' +
            '|Cell in column 2, row 3',
        )).toBe(
            '<p>|===<br>\n' +
            '|Cell in column 1, row 1<br>\n' +
            '|Cell in column 2, row 1</p>\n' +
            '<p>|Cell in column 1, row 2<br>\n' +
            '|Cell in column 2, row 2</p>\n' +
            '<p>|Cell in column 1, row 3<br>\n' +
            '|Cell in column 2, row 3</p>\n',
        );
    });
    it('should not render table without open token', () => {
        expect(transformYfm('|Cell in column 1, row 1\n' +
            '|Cell in column 2, row 1\n' +
            '\n' +
            '|Cell in column 1, row 2\n' +
            '|Cell in column 2, row 2\n' +
            '|===\n' +
            '\n' +
            'Test',
        )).toBe(
            '<p>|Cell in column 1, row 1<br>\n' +
            '|Cell in column 2, row 1</p>\n' +
            '<p>|Cell in column 1, row 2<br>\n' +
            '|Cell in column 2, row 2<br>\n' +
            '|===</p>\n' +
            '<p>Test</p>\n',
        );
    });
    it('should not render table if no empty line before table', () => {
        expect(transformYfm(
            'Test\n' +
            '|===\n' +
            '|Cell in column 1, row 1\n' +
            '|Cell in column 2, row 1\n' +
            '\n' +
            '|Cell in column 1, row 2\n' +
            '|Cell in column 2, row 2\n' +
            '|===',
        )).toBe(
            '<p>Test<br>\n' +
            '|===<br>\n' +
            '|Cell in column 1, row 1<br>\n' +
            '|Cell in column 2, row 1</p>\n' +
            '<p>|Cell in column 1, row 2<br>\n' +
            '|Cell in column 2, row 2<br>\n' +
            '|===</p>\n',
        );
    });
});
