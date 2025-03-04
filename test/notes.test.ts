import dedent from 'ts-dedent';

import alerts from '../src/transform/plugins/notes';
import transform from '../src/transform';

import {callPlugin, tokenize} from './utils';
import {base, customTitle, emptyTitle} from './data/alerts';

const html = (text: string, notesAutotitle = true) => {
    const {
        result: {html},
    } = transform(text, {
        notesAutotitle,
        plugins: [alerts],
    });
    return html;
};

describe('Alerts', () => {
    test('Should transform to new tokens', () => {
        const result = callPlugin(
            alerts,
            tokenize([
                'Text before',
                '',
                '{% note info %}',
                '',
                'Текст примечания.',
                '',
                '{% endnote %}',
                '',
                'Text after',
            ]),
        );

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
                const result = callPlugin(
                    alerts,
                    tokenize([`{% note ${type} %}`, '', 'Текст примечания.', '', '{% endnote %}']),
                );

                expect(result[0].attrs?.[0][1]).toEqual(`yfm-note yfm-accent-${type}`);
                expect(result[2].children?.[0].content).toEqual(title);
            });
        });
    });

    test('Should support custom title', () => {
        const result = callPlugin(
            alerts,
            tokenize([
                'Text before',
                '',
                '{% note info "Custom title" %}',
                '',
                'Текст примечания.',
                '',
                '{% endnote %}',
                '',
                'Text after',
            ]),
        );
        expect(result).toEqual(customTitle);
    });

    test('Should support empty title', () => {
        const result = callPlugin(
            alerts,
            tokenize([
                'Text before',
                '',
                '{% note info "" %}',
                '',
                'Текст примечания.',
                '',
                '{% endnote %}',
                '',
                'Text after',
            ]),
        );

        expect(result).toEqual(emptyTitle);
    });

    test('should render simple note', () => {
        expect(
            html(dedent`
            {% note info "Note title" %}

            Note content

            {% endnote %}
        `),
        ).toMatchSnapshot();
    });

    test('should render siblings notes', () => {
        expect(
            html(dedent`
            {% note info "Note title 1" %}

            Note content 1

            {% endnote %}

            {% note info "Note title 2" %}

            Note content 2

            {% endnote %}
        `),
        ).toMatchSnapshot();
    });

    test('should render nested notes', () => {
        expect(
            html(dedent`
            {% note info "Outer title" %}

            Outer content

            {% note info "Inner title" %}

            Inner content

            {% endnote %}

            {% endnote %}
        `),
        ).toMatchSnapshot();
    });

    test('should render title with format', () => {
        expect(
            html(dedent`
            {% note info "_Italic note title_" %}

            Content

            {% endnote %}
        `),
        ).toMatchSnapshot();
    });

    test('should render note without title (notesAutotitle: true)', () => {
        expect(
            html(dedent`
                {% note info %}

                Note content without title

                {% endnote %}
            `),
        ).toMatchSnapshot();
    });

    test('should render note without title (notesAutotitle: false)', () => {
        expect(
            html(
                dedent`
                {% note info %}

                Note content without title

                {% endnote %}
            `,
                false,
            ),
        ).toMatchSnapshot();
    });

    test('should render note with empty string title', () => {
        expect(
            html(dedent`
                {% note info "" %}

                Note content with empty string title

                {% endnote %}
            `),
        ).toMatchSnapshot();
    });

    test('should render empty note', () => {
        expect(
            html(dedent`
                {% note info "" %}

                {% endnote %}
            `),
        ).toMatchSnapshot();
    });
});
