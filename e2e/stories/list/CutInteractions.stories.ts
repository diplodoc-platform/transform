import dedent from 'ts-dedent';

import {MarkdownSnippetStory, getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/CutInteractions'};

export const CutAfterTheList: MarkdownSnippetStory = {
    name: 'Cut after the list',
    args: {
        snippet: dedent`
        1. This ordered list will be nested.
        2. This item has additional sub-items.
            1. Like this one
            2. And this one
            3. And this as well.
            4. Note that the items in the sublist don't have hierarchical numbering.
        3. Futher numbering on top-level continues where we left off.

        ## A heading

        {% cut "Notice" %}

        1. This notice has a list inside of it.
        2. When this was broken, the list would start with 4.
            1. Sublist for a good measure.

        {% endcut %}

        1. This ordered list will be nested.
        2. This item has additional sub-items.
            1. Like this one
            2. And this one
            3. And this as well.
            4. Note that the items in the sublist don't have hierarchical numbering.
        3. Futher numbering on top-level continues where we left off.

        {% cut "Notice" %}

        1. This notice has a list inside of it.
        2. When this was broken, the list would start with 4.
            1. Sublist for a good measure.

        {% endcut %}
        `,
    },
};

export const CutInsideListChild: MarkdownSnippetStory = {
    name: 'Cut inside list (child)',
    args: {
        snippet: dedent`
        1. This is an ordered nested list.
        2. This item has a sublist.
            1. Sublist item
            2. Another one
            3. A third one. This one has tabs as its children.
        
                {% cut "Notice" %}

                    1. List inside a tab
                    2. Sublist inside a tab
                        1. Bread
                        2. Milk
                        3. Jelly

                {% encut %}

            4. Last item.
        `,
    },
};

export const CutInsideListBreak: MarkdownSnippetStory = {
    name: 'Cut inside list (break)',
    args: {
        snippet: dedent`
        1. This is an ordered nested list.
        2. This item has a sublist.
            1. Sublist item
            2. Another one
            3. A third one. This one has tabs as its children.
        
            {% cut "Notice" %}

                1. List inside a tab
                2. Sublist inside a tab
                    1. Bread
                    2. Milk
                    3. Jelly

            {% encut %}

            4. Last item.
        `,
    },
};
