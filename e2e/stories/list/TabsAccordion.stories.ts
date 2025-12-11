import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/TabsAccordion'};

export const AccordionBasic: MarkdownSnippetStory = {
    name: 'Accordion basic',
    args: {
        snippet: dedent`
        {% list tabs accordion %}

        - Первый пункт

            Контент первого пункта.

        - Второй пункт

            Контент второго пункта.

        {% endlist %}
        `,
    },
};

export const AccordionWithRadioTabs: MarkdownSnippetStory = {
    name: 'Accordion with nested radio tabs',
    args: {
        snippet: dedent`
        {% list tabs accordion %}

        - Вопрос 1

            {% list tabs radio %}

            - Да

                Ответ для "Да".

            - Нет

                Ответ для "Нет".

            {% endlist %}

        - Вопрос 2

            Контент второго пункта аккордеона.

        {% endlist %}
        `,
    },
};

export const AccordionNested: MarkdownSnippetStory = {
    name: 'Accordion inside accordion',
    args: {
        snippet: dedent`
        {% list tabs accordion %}

        - Внешний пункт 1

            {% list tabs accordion %}

            - Внутренний пункт 1

                Контент внутреннего пункта 1.

            - Внутренний пункт 2

                Контент внутреннего пункта 2.

            {% endlist %}

        - Внешний пункт 2

            Второй внешний пункт без вложенного аккордеона.

        {% endlist %}
        `,
    },
};
