/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
// eslint-disable-next-line no-undef
module.exports = {
  roots: ['<rootDir>/test'],
  preset: 'ts-jest',
  transform: {
      '^.+\\.ts?$': 'ts-jest',
  },
  "modulePaths": [
      "<rootDir>"
  ],
  moduleDirectories: [
      "node_modules",
      "src"
  ],
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
