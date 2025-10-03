import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/inline-code/InlineCode.stories';
import {expect, test} from '../fixtures/test';

test.beforeEach(({browserName}) =>
    test.skip(browserName !== 'chromium', `"${browserName}" does not support clipboard`),
);

describeStory(stories, 'Base', () => {
    test('Clipboard inline code click should return correct innerText', async ({yfmRoot, page}) => {
        const anchorButton = yfmRoot.getByRole('button');
        const innerText = await anchorButton.innerText();
        await anchorButton.click();

        const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
        const clipboardContent = await handle.jsonValue();

        expect(clipboardContent).toEqual(innerText);
    });

    test('Click to inline code should open tooltip', async ({yfmRoot, page}) => {
        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const tooltip = page.locator('div[id="tooltip_inline_clipboard_dialog"]');
        const classes = await tooltip.getAttribute('class');

        expect(classes).toContain('open');
    });

    test('Click to inline code should open tooltip and close it after 1second', async ({
        yfmRoot,
        page,
    }) => {
        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const tooltip = page.locator('div[id="tooltip_inline_clipboard_dialog"]');
        await expect(tooltip).toBeVisible();

        await new Promise((r) => setTimeout(r, 1100));

        await expect(tooltip).not.toBeVisible();
    });
});
