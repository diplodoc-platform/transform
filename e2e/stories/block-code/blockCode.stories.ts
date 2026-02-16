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

export const LongContent: MarkdownSnippetStory = {
    name: 'Code block with long content',
    args: {
        snippet: dedent`
            ~~~js showLineNumbers
            export const received = (function factorial(n) { if(n === 0) { return 1; } else { return n * factorial(n - 1); } })(5);
            export const expected = 120;
            ~~~
        `,
        extraOptions: {
            codeLineWrapping: true,
        },
    },
};
