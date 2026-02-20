import {describeStory} from 'fixtures/utils/testStoryModule';

import * as stories from '../stories/term/term.stories';
import {expect, test} from '../fixtures/test';

describeStory(stories, 'BasicTerm', () => {
    test('term element is rendered', async ({yfmRoot}) => {
        const term = yfmRoot.locator('i.yfm-term_title');
        await expect(term).toBeVisible();
        await expect(term).toHaveText('HTML');
    });

    test('term definition block exists', async ({yfmRoot}) => {
        const dfn = yfmRoot.locator('dfn.yfm-term_dfn');
        await expect(dfn).toBeAttached();
        await expect(dfn).toContainText('HyperText Markup Language');
    });

    test('term visual regression', async ({yfmRoot}) => {
        expect(await yfmRoot.screenshot()).toMatchSnapshot('basic-term.png');
    });
});

describeStory(stories, 'AsteriskInText', () => {
    test('all three terms render correctly', async ({yfmRoot}) => {
        const terms = yfmRoot.locator('i.yfm-term_title');
        await expect(terms).toHaveCount(3);
        await expect(terms.nth(0)).toHaveText('<=');
        await expect(terms.nth(1)).toHaveText('=*');
        await expect(terms.nth(2)).toHaveText('>=');
    });

    test('no stray emphasis tags from asterisks', async ({yfmRoot}) => {
        const emphasisElements = yfmRoot.locator('em');
        await expect(emphasisElements).toHaveCount(0);
    });

    test('asterisk term visual regression', async ({yfmRoot}) => {
        expect(await yfmRoot.screenshot()).toMatchSnapshot('asterisk-in-text.png');
    });
});

describeStory(stories, 'TermInSuperscript', () => {
    test('term inside superscript renders', async ({yfmRoot}) => {
        const sup = yfmRoot.locator('sup');
        await expect(sup).toBeVisible();

        const term = sup.locator('i.yfm-term_title');
        await expect(term).toBeVisible();
        await expect(term).toHaveText('?');
    });

    test('superscript term visual regression', async ({yfmRoot}) => {
        expect(await yfmRoot.screenshot()).toMatchSnapshot('term-in-superscript.png');
    });
});

describeStory(stories, 'MultipleTerms', () => {
    test('both terms render in one paragraph', async ({yfmRoot}) => {
        const terms = yfmRoot.locator('i.yfm-term_title');
        await expect(terms).toHaveCount(2);
        await expect(terms.nth(0)).toHaveText('CSS');
        await expect(terms.nth(1)).toHaveText('HTML');
    });

    test('each term has its own definition', async ({yfmRoot}) => {
        const dfns = yfmRoot.locator('dfn.yfm-term_dfn');
        await expect(dfns).toHaveCount(2);
    });

    test('multiple terms visual regression', async ({yfmRoot}) => {
        expect(await yfmRoot.screenshot()).toMatchSnapshot('multiple-terms.png');
    });
});
