import {describeStory} from '../../fixtures/utils/testStoryModule';
import * as stories from '../../stories/table/table.stories';
import * as yfmTableStories from '../../stories/table/yfm-table.stories';
import {expect, test} from '../../fixtures/test';

for (const [story, count] of [
    ['StickyOneRow', 1],
    ['StickyThreeRows', 3],
] as const) {
    describeStory(yfmTableStories, story, () => {
        test('keeps every header row in place while the body scrolls', async ({yfmRoot}) => {
            const table = yfmRoot.locator('table[sticky-header]');
            const headers = table.locator(':scope > thead > tr');
            await expect(headers).toHaveCount(count);
            const headerTops = () =>
                headers.evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().top));
            const bodyTop = () =>
                table
                    .locator(':scope > tbody > tr')
                    .first()
                    .evaluate((row) => row.getBoundingClientRect().top);
            const beforeHeaders = await headerTops();
            const beforeBody = await bodyTop();
            await table.evaluate((el) => {
                el.scrollTop = 180;
            });
            expect(await bodyTop()).toBeLessThan(beforeBody - 100);
            const afterHeaders = await headerTops();
            for (let i = 0; i < count; i++) {
                expect(Math.abs(afterHeaders[i] - beforeHeaders[i])).toBeLessThanOrEqual(2);
            }
        });
    });
}

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
