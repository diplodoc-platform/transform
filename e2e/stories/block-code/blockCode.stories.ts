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

export const RawPreLongContent: MarkdownSnippetStory = {
    name: 'Raw HTML pre with long content',
    args: {
        snippet: dedent`
            Raw HTML pre without inner code:

            <pre>| id                   | hostname                         | service        | status  | created_at          | updated_at          | owner        | flags        |
            https://example.com/artifacts/sha256/9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a089f86d081884c7d659a2feaa0c55ad015</pre>
        `,
        extraOptions: {
            allowHTML: true,
        },
    },
};
