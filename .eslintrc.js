module.exports = {
    extends: ['@diplodoc/eslint-config'],
    root: true,
    overrides: [
        {
            "files": ["*"],
            "rules": {
                "@typescript-eslint/no-explicit-any": 2,
                "@typescript-eslint/no-namespace": 1,
                "no-shadow": "off",
                "@typescript-eslint/no-shadow": "off"
            }
        },
        {
            files: ['*.ts', '*.tsx'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                sourceType: 'module',
                project: ['./tsconfig.transform.json', './tsconfig.json'],
                tsconfigRootDir: __dirname,
            },
        },
    ],
};
