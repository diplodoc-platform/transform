import {describeStory} from '../../fixtures/utils/testStoryModule';
import * as stories from '../../stories/list/TabsAccordion.stories';
import {expect, test} from '../../fixtures/test';

describeStory(stories, 'AccordionBasic', () => {
    test('Visual test only accordion', async ({yfmRoot}) => {
        const first = yfmRoot.getByRole('tab', {name: 'First item'});

        await first.click();
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(stories, 'AccordionWithRadioTabs', () => {
    test('Visual test with nested radio tabs', async ({yfmRoot}) => {
        const question = yfmRoot.getByRole('tab', {name: 'Question 1'});
        await question.click();

        const yesTab = yfmRoot.getByRole('tab', {name: 'Yes'});

        await yesTab.click();
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(stories, 'AccordionNested', () => {
    test('Visual test with nested accordion', async ({yfmRoot}) => {
        const outerFirst = yfmRoot.getByRole('tab', {name: 'Outer item 1'});

        await outerFirst.click();

        const innerFirst = yfmRoot.getByRole('tab', {name: 'Inner item 1'});

        await innerFirst.click();
        await expect(yfmRoot).toHaveScreenshot();
    });
});
