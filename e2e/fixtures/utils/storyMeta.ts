import {Meta, StoryObj} from '@storybook/html';
import '@diplodoc/transform/dist/css/yfm.min.css';

import {transformMd} from './transformPreset';

export type MarkdownSnippetProps = {
    snippet: string;
    additionalRootClassnames?: string[];
};

export type MarkdownSnippetStory = StoryObj<MarkdownSnippetProps>;

export const getSnippetMeta = (): Meta<MarkdownSnippetProps> => ({
    render: ({snippet, additionalRootClassnames = []}) => {
        const div = document.createElement('div');

        div.classList.add('yfm', ...additionalRootClassnames);
        div.id = 'yfm-root';
        div.innerHTML = transformMd(snippet);

        return div;
    },
    argTypes: {
        snippet: {control: 'text'},
    },
});
