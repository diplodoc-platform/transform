const alerts = require('../lib/plugins/notes');
const {callPlugin, tokenize} = require('./utils');
const {base, customTitle, emptyTitle} = require('./data/alerts');

const callAlertsPlugin = callPlugin.bind(null, alerts);

const transform = require('../lib');
const notes = require('../lib/plugins/notes');

const transformYfm = (text) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [notes],
    });
    return html;
};

describe('Alerts', () => {
    test('Should transform to new tokens', () => {
        const result = callAlertsPlugin(tokenize([
            'Text before',
            '',
            '{% note info %}',
            '',
            'Текст примечания.',
            '',
            '{% endnote %}',
            '',
            'Text after',
        ]), {});

        expect(result).toEqual(base);
    });

    describe('Should support all types', () => {
        [
            {type: 'info', title: 'Примечание'},
            {type: 'tip', title: 'Совет'},
            {type: 'alert', title: 'Внимание'},
            {type: 'warning', title: 'Важно'},
        ].forEach(({type, title}) => {
            test(`should support type: ${type}`, () => {
                const result = callAlertsPlugin(tokenize([
                    `{% note ${type} %}`,
                    '',
                    'Текст примечания.',
                    '',
                    '{% endnote %}',
                ]), {});

                expect(result[0].attrs[0][1]).toEqual(`yfm-note yfm-accent-${type}`);
                expect(result[2].children[1].content).toEqual(title);
            });
        });
    });

    test('Should support custom title', () => {
        const result = callAlertsPlugin(tokenize([
            'Text before',
            '',
            '{% note info "Custom title" %}',
            '',
            'Текст примечания.',
            '',
            '{% endnote %}',
            '',
            'Text after',
        ]), {});

        expect(result).toEqual(customTitle);
    });

    test('Should support empty title', () => {
        const result = callAlertsPlugin(tokenize([
            'Text before',
            '',
            '{% note info "" %}',
            '',
            'Текст примечания.',
            '',
            '{% endnote %}',
            '',
            'Text after',
        ]), {});

        expect(result).toEqual(emptyTitle);
    });

    test('should render simple note', () => {
        expect(transformYfm(
            '{% note info "Note title" %}\n' +
            '\n' +
            'Note content\n' +
            '\n' +
            '{% endnote %}',
        )).toBe(
            '<div class="yfm-note yfm-accent-info" note-type="info"><p><strong>Note title</strong></p>\n' +
            '<p>Note content</p>\n' +
            '</div>',
        );
    });

    test('should render siblings notes', () => {
        expect(transformYfm(
            '{% note info "Note title 1" %}\n' +
            '\n' +
            'Note content 1\n' +
            '\n' +
            '{% endnote %}\n' +
            '\n' +
            '{% note info "Note title 2" %}\n' +
            '\n' +
            'Note content 2\n' +
            '\n' +
            '{% endnote %}',
        )).toBe(
            '<div class="yfm-note yfm-accent-info" note-type="info"><p><strong>Note title 1</strong></p>\n' +
            '<p>Note content 1</p>\n' +
            '</div><div class="yfm-note yfm-accent-info" note-type="info"><p><strong>Note title 2</strong></p>\n' +
            '<p>Note content 2</p>\n' +
            '</div>',
        );
    });

    test('should render nested notes', () => {
        expect(transformYfm(
            '{% note info "Outer title" %}\n' +
            '\n' +
            'Outer content\n' +
            '\n' +
            '{% note info "Inner title" %}\n' +
            '\n' +
            'Inner content\n' +
            '\n' +
            '{% endnote %}\n' +
            '\n' +
            '{% endnote %}',
        )).toBe(
            '<div class="yfm-note yfm-accent-info" note-type="info"><p><strong>Outer title</strong></p>\n' +
            '<p>Outer content</p>\n' +
            '<div class="yfm-note yfm-accent-info" note-type="info"><p><strong>Inner title</strong></p>\n' +
            '<p>Inner content</p>\n' +
            '</div></div>',
        );
    });
});
