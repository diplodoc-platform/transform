#!/usr/bin/env node

import {build} from 'esbuild';
import {sassPlugin} from 'esbuild-sass-plugin';
import autoprefixer from 'autoprefixer';
import postcssPresetEnv from 'postcss-preset-env';
import postcss from 'postcss';

import tsconfigJson from '../tsconfig.json' assert {type: 'json'};

/** @type {import('esbuild').BuildOptions}*/
const common = {
    bundle: true,
    sourcemap: true,
    platform: 'browser',
    target: tsconfigJson.compilerOptions.target,
    tsconfig: './tsconfig.json',
};

(async function buildCss() {
    const plugins = [
        sassPlugin({
            async transform(source) {
                const {css} = await postcss([
                    autoprefixer({cascade: false}),
                    postcssPresetEnv({stage: 0}),
                ]).process(source, {from: undefined});

                return css;
            },
        }),
    ];

    await Promise.all([
        build({
            ...common,
            entryPoints: ['src/scss/yfm.scss'],
            outfile: 'dist/css/yfm.css',
            format: 'iife',
            plugins,
        }),
        build({
            ...common,
            entryPoints: ['src/scss/print.scss'],
            outfile: 'dist/css/print.css',
            format: 'iife',
            plugins,
        }),
    ]);

    await build({
        ...common,
        entryPoints: ['dist/css/yfm.css'],
        outfile: 'dist/css/yfm.min.css',
        minify: true,
    });
})();

(async function buildJs() {
    await Promise.all([
        build({
            ...common,
            entryPoints: ['src/js/index.ts'],
            outfile: 'dist/js/yfm.js',
        }),
        build({
            ...common,
            entryPoints: ['src/js/print/index.ts'],
            outfile: 'dist/js/print.js',
        }),
    ]);

    await build({
        ...common,
        entryPoints: ['dist/js/yfm.js'],
        outfile: 'dist/js/yfm.min.js',
        minify: true,
    });
})();
