import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/block-code/blockCode.stories';
import {expect, test} from '../fixtures/test';

describeStory(stories, 'Base', () => {
    test('code block visual regression', async ({yfmRoot}) => {
        const codeBlock = yfmRoot.locator('.yfm-clipboard');
        await expect(codeBlock).toBeVisible();

        expect(await codeBlock.screenshot()).toMatchSnapshot('base-code-block.png', {
            maxDiffPixelRatio: 0.015,
        });
    });

    test('code block visual regression on hover', async ({yfmRoot, page}) => {
        const codeBlock = yfmRoot.locator('.yfm-clipboard');

        await expect(codeBlock).toBeVisible();
        await codeBlock.hover();
        await page.waitForTimeout(50);

        expect(await codeBlock.screenshot()).toMatchSnapshot('base-code-block-hover.png', {
            maxDiffPixelRatio: 0.015,
        });
    });

    test('code block visual regression after click copy button', async ({yfmRoot, page}) => {
        const codeBlock = yfmRoot.locator('.yfm-clipboard');
        const copyButton = codeBlock.locator('.yfm-clipboard-button');

        await expect(codeBlock).toBeVisible();
        await copyButton.click();
        await page.waitForTimeout(100);

        expect(await codeBlock.screenshot()).toMatchSnapshot('base-code-block-copied.png', {
            maxDiffPixelRatio: 0.015,
        });
    });
});
