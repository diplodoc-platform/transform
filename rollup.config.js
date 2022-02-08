const babel = require('rollup-plugin-babel');
const typescript = require('@rollup/plugin-typescript');

module.exports = {
    input: 'src/js/index.ts',
    output: {
        file: 'dist/js/yfm.js',
        format: 'umd',
        name: 'yfm',
    },
    plugins: [
        babel({
            exclude: 'node_modules/**',
            externalHelpersWhitelist: [
                'defineProperties',
                'createClass',
                'inheritsLoose',
                'defineProperty',
                'objectSpread',
            ],
        }),
        typescript(),
    ],
};
