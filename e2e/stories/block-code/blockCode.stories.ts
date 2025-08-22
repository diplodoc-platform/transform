import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/Code/CodeBlock'};

export const Base: MarkdownSnippetStory = {
    name: 'Base block code',
    args: {
        snippet: dedent`
            \`\`\`markdown
            text \`some code\`
            \`\`\`
        `,
    },
};
