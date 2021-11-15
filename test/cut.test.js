const transform = require('../lib');
const cut = require('../lib/plugins/cut');

const transformYfm = (text) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [cut],
    });
    return html;
};

describe('Cut plugin', () => {
    it('should render simple cut', () => {
        expect(transformYfm(
            '{% cut "Cut title" %}\n' +
            '\n' +
            'Cut content\n' +
            '\n' +
            '{% endcut %}',
        )).toBe(
            '<div class="yfm-cut"><div class="yfm-cut-title">Cut title</div>' +
            '<div class="yfm-cut-content"><p>Cut content</p>\n' +
            '</div></div>',
        );
    });
    it('should render siblings cuts', () => {
        expect(transformYfm(
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
        )).toBe(
            '<div class="yfm-cut"><div class="yfm-cut-title">Cut title 1</div>' +
            '<div class="yfm-cut-content"><p>Cut content 1</p>\n</div>' +
            '</div>' +
            '<div class="yfm-cut"><div class="yfm-cut-title">Cut title 2</div>' +
            '<div class="yfm-cut-content"><p>Cut content 2</p>\n</div>' +
            '</div>',
        );
    });
    it('should render nested cuts', () => {
        expect(transformYfm(
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
        )).toBe(
            '<div class="yfm-cut"><div class="yfm-cut-title">Outer title</div>' +
            '<div class="yfm-cut-content"><p>Outer content</p>\n' +
            '<div class="yfm-cut"><div class="yfm-cut-title">Inner title</div>' +
            '<div class="yfm-cut-content"><p>Inner content</p>\n</div>' +
            '</div></div></div>',
        );
    });

});
