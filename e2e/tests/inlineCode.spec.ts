import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/inline-code/inlineCode.stories';
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

    test('Click to inline code should open tooltip and close it after 1sec', async ({
        yfmRoot,
        page,
    }) => {
        const anchorButton = yfmRoot.getByRole('button');
        await anchorButton.click();

        const tooltip = page.locator('dfn[id="tooltip_inline_clipboard_dialog"]');
        let classes = await tooltip.getAttribute('class');

        expect(classes).toContain('open');

        await new Promise((r) => setTimeout(r, 1005));

        classes = await tooltip.getAttribute('class');
        expect(classes).not.toContain('open');
    });
});
