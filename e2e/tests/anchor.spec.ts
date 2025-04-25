import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/anchor/ClipboardAnchor.stories';
import {expect, test} from '../fixtures/test';

test.beforeEach(({browserName}) =>
    test.skip(browserName !== 'chromium', `"${browserName}" does not support clipboard`),
);

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
