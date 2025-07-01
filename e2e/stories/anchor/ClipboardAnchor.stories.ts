import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/Anchor/ClipboardAnchor'};

export const Base: MarkdownSnippetStory = {
    name: 'Base Clipboard Anchor',
    args: {
        snippet: dedent`
        ## Title
        `,
        extraOptions: {
            useCommonAnchorButtons: true,
        },
    },
};

export const Custom: MarkdownSnippetStory = {
    name: 'Custom Clipboard Anchor',
    args: {
        snippet: dedent`
        ## Title {#test-id}
        `,
        extraOptions: {
            useCommonAnchorButtons: true,
        },
    },
};
