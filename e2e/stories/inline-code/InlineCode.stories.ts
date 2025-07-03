import dedent from 'ts-dedent';

import {MarkdownSnippetStory, getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/Code/InlineCode'};

export const Base: MarkdownSnippetStory = {
    name: 'Base inline code',
    args: {
        snippet: dedent`
            text \`some code\`
        `,
    },
};
