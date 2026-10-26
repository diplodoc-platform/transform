import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import postcssPresetEnv from 'postcss-preset-env';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import {nodeModulesPolyfillPlugin} from 'esbuild-plugins-node-modules-polyfill';
import {sassPlugin} from 'esbuild-sass-plugin';

import {resolveFromPlaygroundRoot} from './utils.mjs';

const configuredSassPlugin = sassPlugin({
    cssImports: true,
    async transform(source, _resolve, filepath) {
        source = source.replace(/(?:^@import\s(?:'|")@(.+)(?:'|");)/gimu, (_, group) => {
            const css = readFileSync(
                resolveFromPlaygroundRoot('node_modules', '@' + group),
                'utf8',
            ).replace(/@charset[^;]*;/g, '');

            return '\n\n' + css + '\n\n';
        });

        const config = {from: filepath};

        const res = await postcss([
            autoprefixer({cascade: false}),
            postcssPresetEnv({stage: 0, features: {'logical-properties-and-values': false}}),
        ]).process(source, config);

        return res.css;
    },
});

const configuredNodePolyfillPlugin = nodeModulesPolyfillPlugin({
    globals: {process: true, Buffer: true},
});

const pageConstructorCompatibilityPlugin = {
    name: 'page-constructor-compatibility',
    setup(build) {
        build.onLoad(
            {filter: /page-constructor[\\/]build[\\/]esm[\\/]editor[\\/]data[\\/]index\.js$/},
            ({path: filename}) => {
                const source = readFileSync(filename, 'utf8');
                const templateDir = path.join(path.dirname(filename), 'templates');
                const blocks = readdirSync(templateDir)
                    .filter((file) => file.endsWith('.json'))
                    .map((file) => file.slice(0, -5));
                const loop = 'Object.values(BlockType)';
                if (!source.includes(loop)) {
                    throw new Error(
                        'Page Constructor template loader changed; review the compatibility plugin',
                    );
                }
                return {
                    contents: source.replace(
                        loop,
                        `${loop}.filter((type) => ${JSON.stringify(blocks)}.includes(type))`,
                    ),
                    loader: 'js',
                    resolveDir: path.dirname(filename),
                    watchFiles: [filename],
                    watchDirs: [templateDir],
                };
            },
        );
        const entry = resolveFromPlaygroundRoot('src/PageConstructorEditor/widget.tsx');
        build.onResolve({filter: /^widget$/}, () => ({path: entry, namespace: 'pc-widget'}));
        build.onLoad({filter: /.*/, namespace: 'pc-widget'}, async () => {
            const result = await esbuild.build({
                entryPoints: [entry],
                write: false,
                bundle: true,
                minify: true,
                platform: 'browser',
                format: 'iife',
                jsx: 'automatic',
                loader: {'.css': 'empty', '.scss': 'empty'},
                plugins: [nodeModulesPolyfillPlugin({globals: {process: true, Buffer: true}})],
            });
            return {
                contents: `export default ${JSON.stringify(result.outputFiles[0].text)};`,
                loader: 'js',
                watchFiles: [entry],
            };
        });
    },
};

const common = {
    absWorkingDir: resolveFromPlaygroundRoot(),
    platform: 'browser',
    sourcemap: true,
    minify: false,
    bundle: true,
};

export const ts = ({entryPoints, outfile, outdir} = {}) => {
    const config = {
        ...common,
        plugins: [
            pageConstructorCompatibilityPlugin,
            configuredNodePolyfillPlugin,
            configuredSassPlugin,
        ],
        jsx: 'automatic',
        entryPoints,
    };

    if (outdir) {
        config.outdir = outdir;
    } else {
        config.outfile = outfile;
    }

    return config;
};
