import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/Images/SvgInline'};

export const InlineTrue: MarkdownSnippetStory = {
    name: 'Image Svg Inline true',
    args: {
        snippet: dedent`
        ![svg inline true](./1.svg){inline=true}
        `,
        extraOptions: {
            renderInline: true,
        },
    },
};

export const InlineFalse: MarkdownSnippetStory = {
    name: 'Image Svg Inline false',
    args: {
        snippet: dedent`
        ![svg inline false](./1.svg){inline=false}
        `,
        extraOptions: {
            renderInline: true,
        },
    },
};
