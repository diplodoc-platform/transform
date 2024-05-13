process.env.ESLINT_ENV = 'client';

module.exports = {
    root: true,
    extends: ['@diplodoc/eslint-config'],
    overrides: [
        {
            "files": ["*"],
            "rules": {
                "@typescript-eslint/no-explicit-any": 2,
                "no-useless-concat": 0,
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
                tsconfigRootDir: __dirname + '/../',
            },
        }
    ],
};
