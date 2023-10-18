#!/usr/bin/env node

const {build} = require('esbuild');
const {sassPlugin} = require('esbuild-sass-plugin');
const autoprefixer = require('autoprefixer');
const postcssPresetEnv = require('postcss-preset-env');
const postcss = require('postcss');
const tsconfigJson = require('../tsconfig.json');

const {
    compilerOptions: {target},
} = tsconfigJson;

const common = {
    bundle: true,
    sourcemap: true,
    platform: 'browser',
    target,
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
        })
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
        })
    ]);

    await build({
        ...common,
        entryPoints: ['dist/js/yfm.js'],
        outfile: 'dist/js/yfm.min.js',
        minify: true,
    });
})();
