import {expect, test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

let site: string;

test.beforeAll(async () => {
    site = await mkdtemp(join(tmpdir(), 'diplodoc-html-extension-'));
    execFileSync(process.execPath, [
        resolve(__dirname, '../fixtures/html-extension/build.mjs'),
        site,
    ]);
});

test.afterAll(async () => {
    if (site) {
        await rm(site, {recursive: true, force: true});
    }
});

test('HTML extension preview follows the document theme and resizes with its content', async ({
    page,
}) => {
    const origin = 'http://html-extension.test';
    await page.route(origin + '/', (route) => route.fulfill({path: join(site, 'index.html')}));
    await page.route(origin + '/app.js', (route) => route.fulfill({path: join(site, 'app.js')}));

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({width: 880, height: 800});
    await page.goto(origin);

    const iframe = page.locator('iframe');
    const body = page.frameLocator('iframe').locator('body');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
    await expect(page.locator('#preview')).toContainText('<iframe srcdoc="Raw Markdown HTML">');
    await expect(body).toContainText('Preview text that wraps');
    await expect(body).toHaveCSS('background-color', 'rgb(240, 240, 240)');

    const theme = page.getByLabel('Preview theme');
    await theme.selectOption('dark');
    await expect(body).toHaveCSS('background-color', 'rgb(24, 24, 24)');
    await theme.selectOption('light');
    await expect(body).toHaveCSS('background-color', 'rgb(240, 240, 240)');

    const iframeHeight = () => iframe.evaluate((element) => element.getBoundingClientRect().height);
    const contentHeight = () =>
        body.evaluate((element) => element.ownerDocument.documentElement.scrollHeight);
    await expect(iframe).toHaveAttribute('style', /height: \d+px/);
    const wide = await iframeHeight();
    await page.setViewportSize({width: 320, height: 800});
    await expect.poll(iframeHeight).toBeGreaterThan(wide);
    await expect
        .poll(async () => (await contentHeight()) - (await iframeHeight()))
        .toBeLessThanOrEqual(1);
    await page.setViewportSize({width: 880, height: 800});
    await expect.poll(iframeHeight).toBe(wide);
    expect(errors).toEqual([]);
});
