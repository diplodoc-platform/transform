'use strict';
const MarkdownIt = require('markdown-it');

const alerts = require('../lib/plugins/alerts');
const {callPlugin} = require('./utils');
const {base} = require('./data/alerts');

const md = new MarkdownIt();

function tokenize(lines = []) {
    return md.parse(lines.join('\n\n'), {});
}

const callAlertsPlugin = callPlugin.bind(null, alerts);

describe('Alerts', () => {
    test('Should transform to new tokens', () => {
        const result = callAlertsPlugin(tokenize([
            'Text before',
            '{% alert warning %}',
            'Текст примечания.',
            '{% endnote %}',
            'Text after'
        ]), {});

        expect(result).toEqual(base);
    });

    describe('Should support all types', () => {
        [
            {type: 'note', title: 'Примечание'},
            {type: 'tip', title: 'Совет'},
            {type: 'warning', title: 'Предупреждение'},
            {type: 'important', title: 'Важная информация'}
        ].forEach(({type, title}) => {
            test(`should support type: ${type}`, () => {
                const result = callAlertsPlugin(tokenize([
                    `{% alert ${type} %}`,
                    'Текст примечания.',
                    '{% endnote %}'
                ]), {});

                expect(result[0].attrs[0][1]).toEqual(`alert ${type}`);
                expect(result[2].children[1].content).toEqual(title);
            });
        });
    });
});
