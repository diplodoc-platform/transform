import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/Attributes/Default'};

export const Omitted: MarkdownSnippetStory = {
    name: 'General attributes omitted',
    args: {
        snippet: dedent`
        # Heading {#stable-heading}

        Hello {name}

        Paragraph {.extra #paragraph}

        ![Sized image](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7XcAAAAASUVORK5CYII=){width=20 height=30}
        `,
    },
};
