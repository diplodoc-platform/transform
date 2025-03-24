import dedent from 'ts-dedent';

import {MarkdownSnippetStory, getSnippetMeta} from '../../fixtures/utils/storyMeta';

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

export const BasicUnordered: MarkdownSnippetStory = {
    name: 'Basic Unordered List',
    args: {
        snippet: dedent`
        1. This is an unordered list.
        2. List item markers of unordered lists are usually a dot or a dash.
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
