import type {StorybookConfig} from 'storybook-html-rsbuild';

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
