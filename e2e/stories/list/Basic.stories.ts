import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/Basic'};

export const BasicOrdered: MarkdownSnippetStory = {
    name: 'Basic Ordered List',
    args: {
        snippet: dedent`
        1. This is an ordered list.
        1. Every item has a numbered marker associated with it.
        `,
    },
};

export const BasicOrderedWithEmptyLine: MarkdownSnippetStory = {
    name: 'Basic Ordered List With Empty Line Between Items',
    args: {
        snippet: dedent`
        1. This is an ordered list.

        1. Every item has a numbered marker associated with it.
        `,
    },
};

export const BasicOrderedWithEmptyItem: MarkdownSnippetStory = {
    name: 'Basic Ordered List With Empty Item',
    args: {
        snippet: dedent`
        1. This is an ordered list.
        1.
        1. Every item has a numbered marker associated with it.
        `,
    },
};

export const BasicUnordered: MarkdownSnippetStory = {
    name: 'Basic Unordered List',
    args: {
        snippet: dedent`
        * This is an unordered list.
        * List item markers of unordered lists are usually a dot or a dash.
        `,
    },
};

export const OrderedListWithIndentedLine: MarkdownSnippetStory = {
    name: 'Ordered list with indented line',
    args: {
        snippet: dedent`
        1. This is an ordered list.
           This is an indented line inside the list item.
        1. Every item has a numbered marker associated with it.
        1. Every item has a numbered marker associated with it.
        `,
    },
};

export const OrderedListWithTwoIndentedLines: MarkdownSnippetStory = {
    name: 'Ordered list with two indented lines',
    args: {
        snippet: dedent`
        1. This is an ordered list.
           This is an indented line inside the list item.
           And one more.
        1. Every item has a numbered marker associated with it.
        1. Every item has a numbered marker associated with it.
        `,
    },
};

export const OrderedListIndentedParagraph: MarkdownSnippetStory = {
    name: 'Ordered list with indented paragraph',
    args: {
        snippet: dedent`
        1. This is an ordered list.
           This is an indented paragraph inside the list item.

        1. Every item has a numbered marker associated with it.
        1. Every item has a numbered marker associated with it.
        `,
    },
};

export const OrderedListWithMultipleIndentedParagraphs: MarkdownSnippetStory = {
    name: 'Ordered list with multiple indented paragraphs',
    args: {
        snippet: dedent`
        1. This is an ordered list.
           This is an indented paragraph inside the list item.

           This is an second paragraph inside the list item.

        1. Every item has a numbered marker associated with it.
        1. Every item has a numbered marker associated with it.
        `,
    },
};

export const OrderedNestedSimple: MarkdownSnippetStory = {
    name: 'Nested ordered list (simple)',
    args: {
        snippet: dedent`
        1. This ordered list will be nested.
        2. This item has additional sub-items.
            1. Like this one
            2. And this one
            3. And this as well.
        3. Futher numbering on top-level continues where we left off.
        `,
    },
};

export const OrderedNestedWithIndentedParagraph: MarkdownSnippetStory = {
    name: 'Nested ordered list with indented paragraph',
    args: {
        snippet: dedent`
        1. This ordered list will be nested.
        2. This item has additional sub-items.
            1. Like this one
               This is an indented paragraph inside the nested list item.

            2. And this one
            3. And this as well.
        3. Futher numbering on top-level continues where we left off.
        `,
    },
};

export const OrderedNestedWithMixedContent: MarkdownSnippetStory = {
    name: 'Nested ordered list with mixed content',
    args: {
        snippet: dedent`
        1. This ordered list will be nested.
        2. This item has additional sub-items.
            - Like this one
            - And this one

            This paragraph between

            1. Like this one
            1. And this one

        3. Futher numbering on top-level continues where we left off.
        `,
    },
};

export const BrokenMarkers: MarkdownSnippetStory = {
    name: 'Out-of order markers in source',
    args: {
        snippet: dedent`
        1. In this example, every list item in the source begins with a 1.
        1. More items
            1. A sublist
            1. 2nd sublist item
            7. This one begins with a 7. (Check the controls tab in Storybook for clarification).
        1. Item after sublist ends.
        `,
    },
};

export const NestedMixedList: MarkdownSnippetStory = {
    name: 'Nested mixed list with conditions',
    args: {
        snippet: dedent`
        - If working on frontend
            * Set up the project structure
            * Create reusable components
            * Implement UI interactions

        - If working on backend
            * Design the API routes
                * Implement business logic
                * Implement some tests

        - If working on frontend
            * Create reusable components
            * Implement UI interactions

        - If working on backend
            * Design the API routes
            * Implement business logic
        `,
    },
};

export const MixedLists: MarkdownSnippetStory = {
    name: 'Mixed lists',
    args: {
        snippet: dedent`
        + Create a list by starting a line with \`+\`, \`-\`, or \`*\`
        + Sub-lists are made by indenting 2 spaces:
            - Marker character change forces new list start:
            * Ac tristique libero volutpat at
            + Facilisis in pretium nisl aliquet
            - Nulla volutpat aliquam velit
        + Very easy!
       `,
    },
};
