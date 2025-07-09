import {describeStory} from '../../fixtures/utils/testStoryModule';
import * as stories from '../../stories/table/table.stories';
import {expect, test} from '../../fixtures/test';

describeStory(stories, 'Base', () => {
    test('Visual table with sticky header', async ({yfmRoot}) => {
        await expect(yfmRoot).toHaveScreenshot();

        const table = yfmRoot.getByRole('table');

        await table.evaluate((el) => {
            el.scrollBy(0, 220);
        });

        await expect(yfmRoot).toHaveScreenshot();
    });
});
