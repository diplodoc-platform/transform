import {dirname} from 'node:path';
import {createRequire} from 'node:module';
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

const require = createRequire(import.meta.url);

const plugins = [
    sassPlugin({
        importMapper: (path) => {
            if (path.startsWith('@diplodoc')) {
                return dirname(require.resolve(path));
            }

            return path;
        },

        async transform(source) {
            const {css} = await postcss([
                autoprefixer({cascade: false}),
                postcssPresetEnv({
                    stage: 0,
                    features: {
                        'logical-properties-and-values': false,
                    },
                }),
            ]).process(source, {from: undefined});

            return css;
        },
    }),
];

const StyleChains = [
    [
        {
            ...common,
            entryPoints: ['src/scss/yfm.scss'],
            outfile: 'dist/css/yfm.css',
            format: 'iife',
            plugins,
        },
        {
            ...common,
            entryPoints: ['dist/css/yfm.css'],
            outfile: 'dist/css/yfm.min.css',
            minify: true,
        },
    ],
    [
        {
            ...common,
            entryPoints: ['src/scss/base.scss'],
            outfile: 'dist/css/base.css',
            format: 'iife',
            plugins,
        },
        {
            ...common,
            entryPoints: ['dist/css/base.css'],
            outfile: 'dist/css/base.min.css',
            minify: true,
        },
    ],
    [
        {
            ...common,
            entryPoints: ['src/scss/_yfm-only.scss'],
            outfile: 'dist/css/_yfm-only.css',
            format: 'iife',
            plugins,
        },
        {
            ...common,
            entryPoints: ['dist/css/_yfm-only.css'],
            outfile: 'dist/css/_yfm-only.min.css',
            minify: true,
        },
    ],
    {
        ...common,
        entryPoints: ['src/scss/print.scss'],
        outfile: 'dist/css/print.css',
        format: 'iife',
        plugins,
    },
];

const ScriptChains = [
    [
        {
            ...common,
            entryPoints: ['src/js/index.ts'],
            outfile: 'dist/js/yfm.js',
        },
        {
            ...common,
            entryPoints: ['dist/js/yfm.js'],
            outfile: 'dist/js/yfm.min.js',
            minify: true,
        },
    ],
    [
        {
            ...common,
            entryPoints: ['src/js/base.ts'],
            outfile: 'dist/js/base.js',
        },
        {
            ...common,
            entryPoints: ['dist/js/base.js'],
            outfile: 'dist/js/base.min.js',
            minify: true,
        },
    ],
    [
        {
            ...common,
            entryPoints: ['src/js/_yfm-only.ts'],
            outfile: 'dist/js/_yfm-only.js',
        },
        {
            ...common,
            entryPoints: ['dist/js/_yfm-only.js'],
            outfile: 'dist/js/_yfm-only.min.js',
            minify: true,
        },
    ],
    {
        ...common,
        entryPoints: ['src/js/print/index.ts'],
        outfile: 'dist/js/print.js',
    },
];

const StaticBuildChains = [...StyleChains, ...ScriptChains];

export const runChainsWith = (block) =>
    Promise.all(
        StaticBuildChains.map((chainOrSingleBuild) =>
            Array.isArray(chainOrSingleBuild)
                ? chainOrSingleBuild.reduce(
                      (promise, options) => promise.then(() => block(options)),
                      Promise.resolve(),
                  )
                : block(chainOrSingleBuild),
        ),
    );
