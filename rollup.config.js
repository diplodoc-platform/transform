import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
const babel = require('rollup-plugin-babel');

module.exports = {
    input: 'src/js/index.js',
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
        commonjs(),
        nodeResolve(),
    ],
};
