process.env.ESLINT_ENV = 'client';

module.exports = {
    root: true,
    extends: ['@diplodoc/eslint-config'],
    overrides: [
        {
            files: ['*'],
            rules: {
                "no-shadow": "off",
                'new-cap': [2, {capIsNew: false}],
                '@typescript-eslint/no-namespace': [1, {allowDeclarations: true}],
            },
        },
    ],
};
