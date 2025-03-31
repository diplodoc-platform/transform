import {describeStory} from '../../fixtures/utils/testStoryModule';
import * as stories from '../../stories/list/CutInteractions.stories';
import {expect, test} from '../../fixtures/test';

describeStory(stories, 'CutAfterTheList', () => {
    test('Visual test with cut open', async ({yfmRoot}) => {
        const cuts = await yfmRoot.getByText('Notice', {exact: true}).all();

        for (const cutLocator of cuts) {
            await cutLocator.click();
        }

        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(stories, 'CutInsideListChild', () => {
    test('Visual test with cut open', async ({yfmRoot}) => {
        const cuts = await yfmRoot.getByText('Notice', {exact: true}).all();

        for (const cutLocator of cuts) {
            await cutLocator.click();
        }

        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(stories, 'CutInsideListBreak', () => {
    test('Visual test with cut open', async ({yfmRoot}) => {
        const cuts = await yfmRoot.getByText('Notice', {exact: true}).all();

        for (const cutLocator of cuts) {
            await cutLocator.click();
        }

        await expect(yfmRoot).toHaveScreenshot();
    });
});
