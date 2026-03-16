import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/anchor/ClipboardAnchor.stories';
import {expect, test} from '../fixtures/test';

test.beforeEach(({browserName}) =>
    test.skip(browserName !== 'chromium', `"${browserName}" does not support clipboard`),
);

describeStory(stories, 'Common', () => {
    test('Click to anchor should open tooltip', async ({yfmRoot, page}) => {
        const anchorLink = yfmRoot.locator('.yfm-anchor');
        await anchorLink.click();

        const tooltipId = await anchorLink.getAttribute('data-tooltip-id');
        const tooltip = page.locator(`div[id="${tooltipId}"]`);
        const classes = await tooltip.getAttribute('class');

        expect(classes).toContain('open');
    });

    test('Click to anchor should open tooltip and close it after 1second', async ({
        yfmRoot,
        page,
    }) => {
        const anchorLink = yfmRoot.locator('.yfm-anchor');
        await anchorLink.click();

        const tooltipId = await anchorLink.getAttribute('data-tooltip-id');
        const tooltip = page.locator(`div[id="${tooltipId}"]`);
        await expect(tooltip).toBeVisible();

        await new Promise((r) => setTimeout(r, 1100));

        await expect(tooltip).not.toBeVisible();
    });

    test('Clipboard anchor click should return custom anchor url', async ({yfmRoot, page}) => {
        const url = page.url();
        const anchorLink = yfmRoot.locator('.yfm-anchor');
        await anchorLink.click();

        const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
        const clipboardContent = await handle.jsonValue();

        expect(clipboardContent).toEqual(url + '#test-id');
    });
});

describeStory(stories, 'Base', () => {
    test('Clipboard anchor click should return correct page url', async ({yfmRoot, page}) => {
        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
        const clipboardContent = await handle.jsonValue();

        expect(clipboardContent).toEqual(page.url() + '#title');
    });
});

describeStory(stories, 'Custom', () => {
    test('Clipboard anchor click should return custom anchor url', async ({yfmRoot, page}) => {
        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
        const clipboardContent = await handle.jsonValue();

        expect(clipboardContent).toEqual(page.url() + '#test-id');
    });
});
