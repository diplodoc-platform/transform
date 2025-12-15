import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/TabsAccordion'};

export const AccordionBasic: MarkdownSnippetStory = {
    name: 'Accordion basic',
    args: {
        snippet: dedent`
        {% list tabs accordion %}

        - First item

            Content of the first item.

        - Second item

            Content of the second item.

        {% endlist %}
        `,
    },
};

export const AccordionWithRadioTabs: MarkdownSnippetStory = {
    name: 'Accordion with nested radio tabs',
    args: {
        snippet: dedent`
        {% list tabs accordion %}

        - Question 1

            {% list tabs radio %}

            - Yes

                Answer for "Yes".

            - No

                Answer for "No".

            {% endlist %}

        - Question 2

            Content of the second accordion item.

        {% endlist %}
        `,
    },
};

export const AccordionNested: MarkdownSnippetStory = {
    name: 'Accordion inside accordion',
    args: {
        snippet: dedent`
        {% list tabs accordion %}

        - Outer item 1

            {% list tabs accordion %}

            - Inner item 1

                Content of inner item 1.

            - Inner item 2

                Content of inner item 2.

            {% endlist %}

        - Outer item 2

            Second outer item without nested accordion.

        {% endlist %}
        `,
    },
};
