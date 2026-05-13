import {describeStory} from '../../fixtures/utils/testStoryModule';
import * as stories from '../../stories/table/table.stories';
import * as yfmTableStories from '../../stories/table/yfm-table.stories';
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

describeStory(stories, 'WithoutSticky', () => {
    test('table without sticky', async ({yfmRoot}) => {
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(yfmTableStories, 'Base', () => {
    test('yfm-table', async ({yfmRoot}) => {
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(yfmTableStories, 'NoStipeRows', () => {
    test('yfm-table with disabled stripe rows', async ({yfmRoot}) => {
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(yfmTableStories, 'WithOneHeaderRow', () => {
    test('yfm-table with 1 header row', async ({yfmRoot}) => {
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(yfmTableStories, 'WithThreeHeaderRows', () => {
    test('yfm-table with 3 header rows', async ({yfmRoot}) => {
        await expect(yfmRoot).toHaveScreenshot();
    });
});

describeStory(yfmTableStories, 'WithHeaderRowsAndCellBg', () => {
    test('yfm-table with header rows and cell background', async ({yfmRoot}) => {
        await expect(yfmRoot).toHaveScreenshot();
    });
});
