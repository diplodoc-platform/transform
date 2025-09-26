import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/images/SvgImage.stories';
import {expect, test} from '../fixtures/test';

test.beforeEach(({browserName}) =>
    test.skip(browserName !== 'chromium', `"${browserName}" does not support clipboard`),
);

describeStory(stories, 'InlineTrue', () => {
    test('Svg inline true', async ({yfmRoot}) => {
        const svgImage = await yfmRoot.innerHTML();

        expect(svgImage.includes('<img')).toBeTruthy();
    });
});

describeStory(stories, 'InlineFalse', () => {
    test('Svg inline false', async ({yfmRoot}) => {
        const svgImage = await yfmRoot.innerHTML();

        expect(svgImage.includes('<img')).toBeTruthy();
    });
});
