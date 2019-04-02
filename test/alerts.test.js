'use strict';

const alerts = require('../lib/plugins/alerts');
const {callPlugin, tokenize} = require('./utils');
const {base} = require('./data/alerts');

const callAlertsPlugin = callPlugin.bind(null, alerts);

describe('Alerts', () => {
    test('Should transform to new tokens', () => {
        const result = callAlertsPlugin(tokenize([
            'Text before',
            '',
            '{% alert warning %}',
            '',
            'Текст примечания.',
            '',
            '{% endalert %}',
            '',
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
                    '',
                    'Текст примечания.',
                    '',
                    '{% endalert %}'
                ]), {});

                expect(result[0].attrs[0][1]).toEqual(`alert ${type}`);
                expect(result[2].children[1].content).toEqual(title);
            });
        });
    });
});
