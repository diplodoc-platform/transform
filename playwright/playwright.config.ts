import {defineConfig, devices} from '@playwright/test';
import {resolve} from 'node:path';

export default defineConfig({
    testDir: resolve(__dirname, '../test/e2e'),
    updateSnapshots: 'missing',
    snapshotPathTemplate:
        '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
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
            use: devices['Desktop Chrome'],
        },

        {
            name: 'firefox',
            use: devices['Desktop Firefox'],
        },

        {
            name: 'webkit',
            use: devices['Desktop Safari'],
        },
    ],
});
