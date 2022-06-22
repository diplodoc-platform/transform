/* eslint-env node */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    roots: ['<rootDir>/test'],
    preset: 'ts-jest',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    modulePaths: ['<rootDir>'],
    moduleDirectories: ['node_modules'],
    testPathIgnorePatterns: ['spec.js', 'spec.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sss|styl)$': '<rootDir>/node_modules/jest-css-modules',
        '.+\\.(svg|png|jpg)$': 'identity-obj-proxy',
    },
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
};
