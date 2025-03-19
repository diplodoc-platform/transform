import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
    updateSnapshots: 'missing',
    snapshotPathTemplate:
        '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
    fullyParallel: false,
    forbidOnly: true,
    retries: 2,
    workers: 1,
    reporter: 'html',
    // webServer: {
    //     reuseExistingServer: true,
    //     command: 'BROWSER=true npm run dev',
    //     url: BASE_URL,
    //     timeout: 120 * 1000,
    // },
    use: {
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
