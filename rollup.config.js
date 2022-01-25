
const babel = require('rollup-plugin-babel');

module.exports = {
    input: 'dist/index.js',
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
    ],
};
