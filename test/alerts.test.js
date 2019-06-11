'use strict';

const alerts = require('../lib/plugins/alerts');
const {callPlugin, tokenize} = require('./utils');
const {base, customTitle, emptyTitle} = require('./data/alerts');

const callAlertsPlugin = callPlugin.bind(null, alerts);

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
            'Text after'
        ]), {});

        expect(result).toEqual(base);
    });

    describe('Should support all types', () => {
        [
            {type: 'info', title: 'Примечание'},
            {type: 'tip', title: 'Совет'},
            {type: 'alert', title: 'Предупреждение'},
            {type: 'important', title: 'Важная информация'},
            {type: 'error', title: 'Ошибка'}
        ].forEach(({type, title}) => {
            test(`should support type: ${type}`, () => {
                const result = callAlertsPlugin(tokenize([
                    `{% note ${type} %}`,
                    '',
                    'Текст примечания.',
                    '',
                    '{% endnote %}'
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
            'Text after'
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
            'Text after'
        ]), {});

        expect(result).toEqual(emptyTitle);
    });
});
