import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/table/Basic'};

export const Base: MarkdownSnippetStory = {
    name: 'Base',
    args: {
        snippet: dedent`
| head1  | head2  |
| ----------- | ----------- |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |

{ sticky-header }
`,
    },
};

export const WithoutSticky: MarkdownSnippetStory = {
    name: 'Base',
    args: {
        snippet: dedent`
| head1  | head2  |
| ----------- | ----------- |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
| Text       | Text       |
`,
    },
};
