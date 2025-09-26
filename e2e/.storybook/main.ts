import type {StorybookConfig} from 'storybook-html-rsbuild';

import {pluginNodePolyfill} from '@rsbuild/plugin-node-polyfill';

const config: StorybookConfig = {
    stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
        {
            name: '@storybook/addon-essentials',
            options: {
                docs: false,
            },
        },
        '@chromatic-com/storybook',
        '@storybook/addon-interactions',
    ],
    framework: {
        name: 'storybook-html-rsbuild',
        options: {},
    },
    rsbuildFinal: (config) => {
        // Add node polyfill plugin
        config.plugins = config.plugins || [];
        config.plugins.push(pluginNodePolyfill());

        config.resolve = {
            ...config.resolve,
            alias: {
                ...config.resolve?.alias,
                process: require.resolve('process/browser'),
                url: require.resolve('url/'),
            },
        };

        return config;
    },
};
export default config;
