import {describeStory} from '../../fixtures/utils/testStoryModule';
import * as stories from '../../stories/list/TabsInteraction.stories';
import {expect, test} from '../../fixtures/test';

describeStory(stories, 'TabsAfterTheList', () => {
    test('Visual test both tabs', async ({yfmRoot}) => {
        const tab1 = yfmRoot.getByRole('tab', {name: 'Tab 1 title'});

        await tab1.click();
        await expect(yfmRoot).toHaveScreenshot();

        const tab2 = yfmRoot.getByRole('tab', {name: 'Tab 2 title'});

        await tab2.click();
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(stories, 'TabsInsideListChild', () => {
    test('Visual test both tabs', async ({yfmRoot}) => {
        const tab1 = yfmRoot.getByRole('tab', {name: 'Tab 1 title'});

        await tab1.click();
        await expect(yfmRoot).toHaveScreenshot();

        const tab2 = yfmRoot.getByRole('tab', {name: 'Tab 2 title'});

        await tab2.click();
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(stories, 'TabsInsideListBreak', () => {
    test('Visual test both tabs', async ({yfmRoot}) => {
        const tab1 = yfmRoot.getByRole('tab', {name: 'Tab 1 title'});

        await tab1.click();
        await expect(yfmRoot).toHaveScreenshot();

        const tab2 = yfmRoot.getByRole('tab', {name: 'Tab 2 title'});

        await tab2.click();
        await expect(yfmRoot).toHaveScreenshot();
    });
});
