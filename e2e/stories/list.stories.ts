import dedent from 'ts-dedent';

import {MarkdownSnippetStory, getSnippetMeta} from '../fixtures/utils';

export default {...getSnippetMeta(), title: 'Builtins/List'};

export const PlainOrdered: MarkdownSnippetStory = {
    name: 'Basic Ordered List',
    args: {
        snippet: dedent`
        1. This is an ordered list.
        1. Every item has a marker associated with it.
        `,
    },
};
