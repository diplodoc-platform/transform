import {describeStory} from '../../fixtures/utils/testStoryModule';
import * as stories from '../../stories/list/Complex.stories';
import {expect, test} from '../../fixtures/test';

describeStory(stories, 'Complex', () => {
    test('Visual test with all interactive elements', async ({yfmRoot}) => {
        const tab1 = yfmRoot.getByRole('tab', {name: 'USER is not in sudoers file'});
        const tab2 = yfmRoot.getByRole('tab', {name: 'command not found: sudo'});

        await tab1.click();

        const cut = yfmRoot.getByText('Padding', {exact: true});

        await cut.click();
        await expect(yfmRoot).toHaveScreenshot();
        await tab2.click();
        await expect(yfmRoot).toHaveScreenshot();
    });
});
