import {describeStory} from '../fixtures/utils/testStoryModule';
import * as stories from '../stories/attributes/Default.stories';
import {expect, test} from '../fixtures/test';

describeStory(stories, 'Omitted', () => {
    test('keeps general attrs literal while heading IDs and image dimensions work', async ({
        yfmRoot,
    }) => {
        await expect(yfmRoot.getByText('Hello {name}', {exact: true})).toBeVisible();
        await expect(
            yfmRoot.getByText('Paragraph {.extra #paragraph}', {exact: true}),
        ).toBeVisible();
        await expect(yfmRoot.locator('#paragraph, .extra')).toHaveCount(0);
        await expect(
            yfmRoot.getByRole('heading', {name: 'Heading', level: 1, exact: true}),
        ).toHaveAttribute('id', 'stable-heading');
        await expect(yfmRoot.locator('h1 a.yfm-anchor')).toHaveAttribute('href', '#stable-heading');
        await expect(yfmRoot.getByAltText('Sized image')).toHaveAttribute('width', '20');
        await expect(yfmRoot.getByAltText('Sized image')).toHaveAttribute('height', '30');
    });
});
