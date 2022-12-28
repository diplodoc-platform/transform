/* eslint-env node */

import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
const babel = require('rollup-plugin-babel');

const plugins = [
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
    typescript({module: 'esnext', include: './src/js/**/*'}),
]

module.exports = [{
    input: 'src/js/index.ts',
    output: {
        file: 'dist/js/yfm.js',
        format: 'umd',
        name: 'yfm',
        sourcemap: true,
    },
    plugins,
}, {
    input: 'src/js/print/index.ts',
    output: {
        file: 'dist/js/print.js',
        format: 'umd',
        name: 'yfm',
        sourcemap: true,
    },
    plugins,
}];
