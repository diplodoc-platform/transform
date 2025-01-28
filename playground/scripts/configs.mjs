import {readFileSync} from 'node:fs';
import {sassPlugin} from 'esbuild-sass-plugin';
import autoprefixer from 'autoprefixer';
import postcssPresetEnv from 'postcss-preset-env';
import postcss from 'postcss';
import {polyfillNode} from 'esbuild-plugin-polyfill-node';

import {resolveFromPlaygroundRoot} from './utils.mjs';

const configuredSassPlugin = sassPlugin({
    cssImports: true,
    // TODO, fixme: this allegedly breaks the dependency graph
    async transform(source, _resolve, filepath) {
        source = source.replace(/(?:^@import\s(?:'|")@(.+)(?:'|");)/gimu, (_, group) => {
            const css = readFileSync(
                resolveFromPlaygroundRoot('node_modules', '@' + group),
                'utf8',
            );

            return '\n\n' + css + '\n\n';
        });

        const config = {from: filepath};

        const res = await postcss([
            autoprefixer({cascade: false}),
            postcssPresetEnv({stage: 0}),
        ]).process(source, config);

        return res.css;
    },
});

const configuredNodePolyfillPlugin = polyfillNode({
    polyfills: {
        fs: true,
    },
});

const common = {
    platform: 'browser',
    sourcemap: true,
    minify: false,
    bundle: true,
};

export const ts = ({entryPoints, outfile, outdir} = {}) => {
    const config = {
        ...common,
        plugins: [configuredNodePolyfillPlugin, configuredSassPlugin],
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        entryPoints,
    };

    if (outdir) {
        config.outdir = outdir;
    } else {
        config.outfile = outfile;
    }

    return config;
};
