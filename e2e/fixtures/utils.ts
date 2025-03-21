import {Meta, StoryObj} from '@storybook/html';
import transform from '@diplodoc/transform';
import '@diplodoc/transform/dist/css/yfm.min.css';

export type MarkdownSnippetProps = {
    snippet: string;
};

export type MarkdownSnippetStory = StoryObj<MarkdownSnippetProps>;

export const getSnippetMeta = (): Meta<MarkdownSnippetProps> => ({
    render: ({snippet}) => {
        const div = document.createElement('div');

        div.classList.add('yfm');
        div.id = 'yfm-root';
        div.innerHTML = transform(snippet).result.html;

        return div;
    },
    argTypes: {
        snippet: {control: 'text'},
    },
});
