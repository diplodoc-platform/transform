import {Meta} from '@storybook/html';

import {expect, test} from '../test';

import {MarkdownSnippetProps, MarkdownSnippetStory} from './storyMeta';

type CSFModule = {
    default: Meta<MarkdownSnippetProps>;
    [key: string]: MarkdownSnippetStory;
};

export const describeStory = async <T extends CSFModule>(
    storyModule: T,
    storyName: Exclude<keyof T, 'default'>,
    block: () => void,
) => {
    const {default: meta, ...stories} = storyModule;

    test.describe(`CSF File: ${meta.title}, Story: ${stories[storyName].name}`, () => {
        test.use({metaTitle: meta.title, storyName: String(storyName)});

        block();
    });
};

export const visualTestStoryModule = async (storyModule: CSFModule) => {
    const {default: meta, ...stories} = storyModule;

    test.describe(`CSF File: ${meta.title}`, () => {
        Object.entries(stories).forEach(([exportName, story]) => {
            test.describe(() => {
                test.use({metaTitle: meta.title, storyName: exportName});

                test(`Story: ${story.name}`, async ({yfmRoot}) => {
                    await expect(yfmRoot).toHaveScreenshot();
                });
            });
        });
    });
};
