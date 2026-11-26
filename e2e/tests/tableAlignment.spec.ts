import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/table/yfm-table.stories';
import {expect, test} from '../fixtures/test';

describeStory(stories, 'IndependentAlignment', () => {
    test.beforeEach(async ({page, yfmRoot}) => {
        await page.addStyleTag({
            content: '#yfm-root th, #yfm-root td { min-width: 120px; height: 120px; }',
        });
        await yfmRoot.locator('th, td').evaluateAll((cells) => {
            for (const cell of cells) {
                cell.classList.remove(
                    `cell-halign-${cell.getAttribute('data-halign')}`,
                    `cell-valign-${cell.getAttribute('data-valign')}`,
                );
            }
        });
    });

    for (const direction of ['ltr', 'rtl']) {
        test(`should align cells by data attributes in ${direction}`, async ({yfmRoot}) => {
            await yfmRoot.evaluate((root, dir) => root.setAttribute('dir', dir), direction);

            await expect(yfmRoot).toHaveScreenshot(`cell-alignment-${direction}.png`);
        });
    }
});
