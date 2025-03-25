import type {StorybookConfig} from '@storybook/html-webpack5';

const config: StorybookConfig = {
    stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
        '@storybook/addon-webpack5-compiler-swc',
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
        name: '@storybook/html-webpack5',
        options: {},
    },
    webpackFinal: (config) => {
        config.resolve = {
            ...config.resolve,
            fallback: {
                ...config.resolve?.fallback,
                process: require.resolve('process/browser'),
                url: require.resolve('url/'),
            },
        };

        return config;
    },
};
export default config;
