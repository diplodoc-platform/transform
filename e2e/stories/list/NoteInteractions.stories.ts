import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/NoteInteractions'};

export const NoteAfterTheList: MarkdownSnippetStory = {
    name: 'Note after the list',
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

        {% note info "Notice" %}

        1. This notice has a list inside of it.
        2. When this was broken, the list would start with 4.
            1. Sublist for a good measure.

        {% endnote %}

        1. This ordered list will be nested.
        2. This item has additional sub-items.
            1. Like this one
            2. And this one
            3. And this as well.
            4. Note that the items in the sublist don't have hierarchical numbering.
        3. Futher numbering on top-level continues where we left off.

        {% note info "Notice" %}

        1. This notice has a list inside of it.
        2. When this was broken, the list would start with 4.
            1. Sublist for a good measure.

        {% endnote %}
        `,
    },
};

export const NoteInsideListChild: MarkdownSnippetStory = {
    name: 'Note inside list (child)',
    args: {
        snippet: dedent`
        1. This list will have a note inside of it and its sublists.
           
            {% note info "Notice" %}

            1. It's actually important to check the sources for these snippets, because notes can:
                1. Either break the list, or
                2. Be a child of a list item.
            2. Breaking the list introduces a \`start\` attribute on the list after the break.
            3. This attribute should be handled by the styles that are being tested here.

            {% endnote %}
        2. This list will have notes as a **child** of its corresponding parent (a list item).
            1. A sublist.
            2. More items for the sublist.
            3. This one has a note

                {% note info "Notice" %}

                1. Do something.
                2. Do something else.
                    1. Make sure it's not the same thing you did in #1.

                {% endnote %}
            
            4. Sublist, cont'd. (Should have marker ending with a 4).
        `,
    },
};

export const NoteInsideListBreak: MarkdownSnippetStory = {
    name: 'Note inside list (break)',
    args: {
        snippet: dedent`
        1. This list will have a note inside of it and its sublists.
           
        {% note info "Notice" %}

        1. It's actually important to check the sources for these snippets, because notes can:
            1. Either break the list, or
            2. Be a child of a list item.
        2. Breaking the list introduces a \`start\` attribute on the list after the break.
        3. This attribute should be handled by the styles that are being tested here.

        {% endnote %}

        2. This list will have notes which break its corresponding list.
            1. A sublist.
            2. More items for the sublist.
            3. This one has a note

            {% note info "Notice" %}

            1. Do something.
            2. Do something else.
                1. Make sure it's not the same thing you did in #1.

            {% endnote %}
            
            4. Sublist, cont'd. (Should have marker ending with a 4).
        `,
    },
};
