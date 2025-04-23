import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/anchor/ClipboardAnchor.stories';
import {expect, test} from '../fixtures/test';

describeStory(stories, 'Base', () => {
    test('Clipboard anchor click should return correct page url', async ({
        yfmRoot,
        page,
        context,
    }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
        const clipboardContent = await handle.jsonValue();

        expect(clipboardContent).toEqual(page.url() + '#title');
    });
});

describeStory(stories, 'Custom', () => {
    test('Clipboard anchor click should return custom anchor url', async ({
        yfmRoot,
        page,
        context,
    }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
        const clipboardContent = await handle.jsonValue();

        expect(clipboardContent).toEqual(page.url() + '#test-id');
    });
});

describeStory(stories, 'WithPath', () => {
    test('Clipboard anchor click should return anchor with path', async ({
        yfmRoot,
        page,
        context,
    }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
        const clipboardContent = await handle.jsonValue();

        const url = new URL(page.url());

        expect(clipboardContent).toEqual(url.origin + '/test#title');
    });
});
