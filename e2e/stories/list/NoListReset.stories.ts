import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/List/NoListReset'};

export const OrderedNestedNoHier: MarkdownSnippetStory = {
    name: 'Nested ordered list (no sublist numbering cascade)',
    args: {
        snippet: dedent`
        1. This ordered list will be nested.
        2. This item has additional sub-items.
            1. Like this one
            2. And this one
            3. And this as well.
            4. Note that the items in the sublist don't have hierarchical numbering.
        3. Futher numbering on top-level continues where we left off.

        {.yfm_no-list-reset}

        1. For this list, the \`.yfm_no-list-reset\` classname is not added.
            1. As such, subitems still have hierarchical numbering, which is on by default.
            2. More items just to demonstrate this a bit better.
        `,
    },
};

export const OrderedNestedNoHierGlobal: MarkdownSnippetStory = {
    name: 'Nested ordered list (no sublist numbering cascade, global setting)',
    args: {
        snippet: dedent`
        1. This ordered list will be nested.
        2. This item has additional sub-items.
            1. Like this one
            2. And this one
            3. And this as well.
            4. Note that the items in the sublist don't have hierarchical numbering.
        3. Futher numbering on top-level continues where we left off.

        Something to break the two lists.

        1. \`.yfm_no-list-reset\` classname is applied to the root this time.
            1. As such, subitems won't have hierarchical numbering.
            2. More items just to demonstrate this a bit better.
        `,
        additionalRootClassnames: ['yfm_no-list-reset'],
    },
};
