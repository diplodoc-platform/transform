import type {Meta, StoryObj} from '@storybook/html';
import type {OptionsType} from '../../../lib/typings';

import '@diplodoc/transform/dist/css/yfm.min.css';
import '@diplodoc/transform/dist/css/print.css';
import '@diplodoc/transform/dist/js/yfm.js';

import {transformMd} from './transformPreset';

export type MarkdownSnippetProps = {
    snippet: string;
    additionalRootClassnames?: string[];
    extraOptions?: OptionsType;
};

export type MarkdownSnippetStory = StoryObj<MarkdownSnippetProps>;

export const getSnippetMeta = (): Meta<MarkdownSnippetProps> => ({
    render: ({snippet, additionalRootClassnames = [], extraOptions}) => {
        const div = document.createElement('div');

        div.classList.add('yfm', ...additionalRootClassnames);
        div.id = 'yfm-root';
        div.innerHTML = transformMd(snippet, extraOptions);

        return div;
    },
    argTypes: {
        snippet: {control: 'text'},
    },
});
