import type {Locator} from '@playwright/test';

import {test as base, expect} from '@playwright/test';

type TestFixtures = {
    metaTitle?: string;
    storyName?: string;
    storyIntenalId: string;
    yfmRoot: Locator;
};

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
const kebabize = (str: string) =>
    str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
const composeStoryUrl = (metaTitle: string, exportName: string) =>
    `${metaTitle.replace(/[ /]/g, '-').toLowerCase()}--${kebabize(exportName)}`;

export const test = base.extend<TestFixtures>({
    metaTitle: ['CSF Meta Title', {option: true}],
    storyName: ['CSF Story Name', {option: true}],

    storyIntenalId: async ({metaTitle, storyName}, use) => {
        expect(metaTitle).toBeDefined();
        expect(storyName).toBeDefined();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await use(composeStoryUrl(metaTitle!, storyName!));
    },

    yfmRoot: async ({page, storyIntenalId}, use) => {
        await page.goto(`/iframe.html?id=${storyIntenalId}`);
        await page.waitForSelector('#yfm-root');

        await use(page.locator('#yfm-root'));
    },
});

export {expect} from '@playwright/test';
