import transform from '../src/transform';
import cut from '../src/transform/plugins/cut';

const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [cut],
    });
    return html;
};

describe('Cut plugin', () => {
    it('should render simple cut', () => {
        expect(
            transformYfm(
                '{% cut "Cut title" %}\n' + '\n' + 'Cut content\n' + '\n' + '{% endcut %}',
            ).replace(/(\r\n|\n|\r)/gm, ''),
        ).toBe(
            '<details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Cut title</summary>' +
                '<div class="yfm-cut-content"><p>Cut content</p></div>' +
                '</details>',
        );
    });

    it('should render simple cut with code in it', () => {
        expect(
            transformYfm(
                '{% cut "Cut title" %}\n' +
                    '\n' +
                    '```\n' +
                    'Code\n' +
                    '```\n' +
                    '\n' +
                    '{% endcut %}',
            ).replace(/(\r\n|\n|\r)/gm, ''),
        ).toBe(
            '<details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Cut title</summary>' +
                '<div class="yfm-cut-content">' +
                '<pre><code class="hljs">Code</code></pre>' +
                '</div>' +
                '</details>',
        );
    });

    it('should render siblings cuts', () => {
        expect(
            transformYfm(
                '{% cut "Cut title 1" %}\n' +
                    '\n' +
                    'Cut content 1\n' +
                    '\n' +
                    '{% endcut %}\n' +
                    '\n' +
                    '{% cut "Cut title 2" %}\n' +
                    '\n' +
                    'Cut content 2\n' +
                    '\n' +
                    '{% endcut %}',
            ).replace(/(\r\n|\n|\r)/gm, ''),
        ).toBe(
            '<details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Cut title 1</summary>' +
                '<div class="yfm-cut-content"><p>Cut content 1</p>' +
                '</div></details>' +
                '<details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Cut title 2</summary>' +
                '<div class="yfm-cut-content">' +
                '<p>Cut content 2</p>' +
                '</div></details>',
        );
    });

    it('should render nested cuts', () => {
        expect(
            transformYfm(
                '{% cut "Outer title" %}\n' +
                    '\n' +
                    'Outer content\n' +
                    '\n' +
                    '{% cut "Inner title" %}\n' +
                    '\n' +
                    'Inner content\n' +
                    '\n' +
                    '{% endcut %}\n' +
                    '\n' +
                    '{% endcut %}',
            ).replace(/(\r\n|\n|\r)/gm, ''),
        ).toBe(
            '<details class="yfm-cut"><summary class="yfm-cut-title">' +
                'Outer title</summary><div class="yfm-cut-content">' +
                '<p>Outer content</p><details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Inner title</summary>' +
                '<div class="yfm-cut-content"><p>Inner content</p>' +
                '</div></details></div></details>',
        );
    });

    it('should render title with format', () => {
        expect(
            transformYfm(
                '{% cut "**Strong cut title**" %}\n' +
                    '\n' +
                    'Content we want to hide\n' +
                    '\n' +
                    '{% endcut %}',
            ).replace(/(\r\n|\n|\r)/gm, ''),
        ).toBe(
            '<details class="yfm-cut"><summary class="yfm-cut-title">' +
                '<strong>Strong cut title</strong>' +
                '</summary><div class="yfm-cut-content">' +
                '<p>Content we want to hide</p>' +
                '</div></details>',
        );
    });

    it('should close all tags correctly and insert two p tags', () => {
        expect(
            transformYfm(
                '* {% cut "Cut 1" %}\n' +
                    '\n' +
                    '  Some text\n' +
                    '\n' +
                    '  Some text\n' +
                    '\n' +
                    '{% endcut %}',
            ).replace(/(\r\n|\n|\r)/gm, ''),
        ).toBe(
            '<ul><li>' +
                '<details class="yfm-cut"><summary class="yfm-cut-title">Cut 1</summary>' +
                '<div class="yfm-cut-content"><p>Some text</p>' +
                '<p>Some text</p>' +
                '</div></details></li></ul>',
        );
    });

    it('should close all tags correctly when given a bullet-list with several items', () => {
        expect(
            transformYfm(
                '* {% cut "Cut 1" %}\n' +
                    '\n' +
                    '  Some text\n' +
                    '\n' +
                    '  {% endcut %}' +
                    '\n' +
                    '* {% cut "Cut 2" %}\n' +
                    '\n' +
                    '  Some text\n' +
                    '\n' +
                    '  {% endcut %}' +
                    '\n' +
                    '* {% cut "Cut 3" %}\n' +
                    '\n' +
                    '  Some text\n' +
                    '\n' +
                    '{% endcut %}',
            ).replace(/(\r\n|\n|\r)/gm, ''),
        ).toBe(
            '<ul><li>' +
                '<details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Cut 1</summary>' +
                '<div class="yfm-cut-content"><p>Some text</p></div>' +
                '</details></li>' +
                '<li><details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Cut 2</summary><div class="yfm-cut-content">' +
                '<p>Some text</p></div></details></li><li><details class="yfm-cut">' +
                '<summary class="yfm-cut-title">Cut 3</summary>' +
                '<div class="yfm-cut-content"><p>Some text</p></div></details></li></ul>',
        );
    });
});
