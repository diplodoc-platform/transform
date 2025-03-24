import {defineConfig, devices} from '@playwright/test';
import {resolve} from 'node:path';

const narrowerViewport = {
    width: 600,
    height: 900,
};

export default defineConfig({
    testDir: resolve(__dirname, '../tests/'),
    updateSnapshots: 'missing',
    snapshotPathTemplate:
        '{testDir}/__screenshots__/{testFilePath}/{projectName}/{arg}-{platform}{ext}',
    fullyParallel: false,
    forbidOnly: true,
    retries: 2,
    workers: 1,
    reporter: [['html', {open: 'never'}]],
    webServer: {
        reuseExistingServer: true,
        command: 'npm run storybook -- --ci',
        url: 'http://localhost:6006',
        timeout: 120 * 1000,
    },
    use: {
        baseURL: 'http://localhost:6006',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome'], viewport: narrowerViewport},
        },

        {
            name: 'firefox',
            use: {...devices['Desktop Firefox'], viewport: narrowerViewport},
        },

        {
            name: 'webkit',
            use: {...devices['Desktop Safari'], viewport: narrowerViewport},
        },
    ],
    expect: {
        toHaveScreenshot: {
            maxDiffPixels: 0,
        },
    },
});
