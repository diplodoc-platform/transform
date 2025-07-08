import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/TabsInteractions'};

export const TabsAfterTheList: MarkdownSnippetStory = {
    name: 'Tabs after the list',
    args: {
        snippet: dedent`
        1. This is an ordered nested list.
        2. This item has a sublist.
            1. Sublist item
            2. Another one
            3. A third one
        
        {% list tabs %}

        - Tab 1 title

            1. List inside a tab
            2. Sublist inside a tab
                1. Bread
                2. Milk
                3. Jelly

        - Tab 2 title
        
            1. List inside a tab
            2. Sublist inside a tab
                1. Fish
                2. Chocolate

        {% endlist %}
        `,
    },
};

export const TabsInsideListChild: MarkdownSnippetStory = {
    name: 'Tabs inside list (child)',
    args: {
        snippet: dedent`
        1. This is an ordered nested list.
        2. This item has a sublist.
            1. Sublist item
            2. Another one
            3. A third one. This one has tabs as its children.
        
                {% list tabs %}

                - Tab 1 title

                    1. List inside a tab
                    2. Sublist inside a tab
                        1. Bread
                        2. Milk
                        3. Jelly

                - Tab 2 title
                
                    1. List inside a tab
                    2. Sublist inside a tab
                        1. Fish
                        2. Chocolate

                {% endlist %}

            4. Last item.
        `,
    },
};

export const TabsInsideListBreak: MarkdownSnippetStory = {
    name: 'Tabs inside list (break)',
    args: {
        snippet: dedent`
        1. This is an ordered nested list.
        2. This item has a sublist.
            1. Sublist item
            2. Another one
            3. A third one. Tabs follow, breaking the list into two.
        
            {% list tabs %}

            - Tab 1 title

                1. List inside a tab
                2. Sublist inside a tab
                    1. Bread
                    2. Milk
                    3. Jelly

            - Tab 2 title
            
                1. List inside a tab
                2. Sublist inside a tab
                    1. Fish
                    2. Chocolate

            {% endlist %}
                
            4. Last item.
        `,
    },
};
