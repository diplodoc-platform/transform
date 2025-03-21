import test, {expect} from '@playwright/test';

import * as storyModule from '../stories/list.stories';

const {default: meta, ...stories} = storyModule;

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
const kebabize = (str: string) =>
    str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
const composeStoryUrl = (metaTitle = '', exportName: string) =>
    `/iframe.html?id=${metaTitle.replace(/[ /]/g, '-').toLowerCase()}--${kebabize(exportName)}`;

Object.entries(stories).forEach(([exportName, story]) => {
    test(`Story: ${meta.title} ${story.name}`, async ({page}) => {
        await page.goto(composeStoryUrl(meta.title, exportName));
        await page.waitForSelector('#yfm-root');

        await expect(page.locator('#yfm-root')).toHaveScreenshot();
    });
});
