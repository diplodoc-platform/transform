import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/Code/InlineCode'};

export const Base: MarkdownSnippetStory = {
    name: 'Base inline code',
    args: {
        snippet: dedent`
            text \`some code\`
        `,
    },
};
