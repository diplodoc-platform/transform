import {expect, test} from '@playwright/test';

import {sanitize} from '../../../lib/sanitize';

test.describe.configure({retries: 0});

const escape = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
const embed = (content: string) =>
    '<iframe data-yfm-sandbox-mode="srcdoc" sandbox="allow-same-origin" ' +
    `srcdoc="${escape(content)}"></iframe>`;

test('safe srcdoc remains readable and accessible to the parent runtime', async ({page}) => {
    await page.route('**/*', (route) => route.abort());
    await page.setContent(sanitize(embed('<p id="marker" style="color:red">Visible HTML</p>')));

    const iframe = page.locator('iframe');
    await expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
    await expect(page.frameLocator('iframe').locator('#marker')).toHaveText('Visible HTML');
    await expect(page.frameLocator('iframe').locator('#marker')).toHaveCSS(
        'color',
        'rgb(255, 0, 0)',
    );
    expect(
        await iframe.evaluate(
            (element) =>
                (element as HTMLIFrameElement).contentDocument?.getElementById('marker')
                    ?.textContent,
        ),
    ).toBe('Visible HTML');
});

for (const [name, payload] of [
    ['script', '<script>parent.__srcdocExecuted = true</script>'],
    ['event', '<img src="https://example.invalid/missing" onerror="parent.__srcdocExecuted=true">'],
    ['SVG event', '<svg onload="parent.__srcdocExecuted=true"></svg>'],
    ['raw-text escape', '<iframe><img src=x onerror="parent.__srcdocExecuted=true"></iframe>'],
    ['document escape', '</body></html><script>parent.__srcdocExecuted=true</script>'],
    [
        'refresh',
        '<meta http-equiv="refresh" content="0;url=javascript:parent.__srcdocExecuted=true">',
    ],
]) {
    test(`srcdoc rejects active content: ${name}`, async ({page}) => {
        await page.route('**/*', (route) => route.abort());
        await page.setContent(
            '<script>window.__srcdocExecuted = false</script>' +
                sanitize(embed(`<p id="marker">Visible</p>${payload}`)),
        );

        const frame = page.frameLocator('iframe');
        await expect(frame.locator('#marker')).toHaveText('Visible');
        await expect(
            frame.locator('script, iframe, object, embed, [onerror], [onload]'),
        ).toHaveCount(0);
        expect(await page.evaluate(() => Reflect.get(window, '__srcdocExecuted'))).toBe(false);
    });
}

test('sandbox and CSP still block a script inserted after sanitization', async ({page}) => {
    await page.setContent(
        '<script>window.__srcdocExecuted = false</script>' +
            sanitize(embed('<p id="marker">Visible</p>')),
    );
    await expect(page.frameLocator('iframe').locator('#marker')).toHaveText('Visible');
    await page.locator('iframe').evaluate((element) => {
        const iframe = element as HTMLIFrameElement;
        iframe.srcdoc += '<script>parent.__srcdocExecuted = true</script><p id="after">After</p>';
    });
    await expect(page.frameLocator('iframe').locator('#after')).toHaveText('After');
    expect(await page.evaluate(() => Reflect.get(window, '__srcdocExecuted'))).toBe(false);
});
