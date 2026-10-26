import {mkdir, readFile, rm} from 'node:fs/promises';
import path from 'node:path';
import * as esbuild from 'esbuild';

import * as configs from './configs.mjs';
import {resolveFromPlaygroundRoot} from './utils.mjs';

const {dependencies, peerDependencies} = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);

const external = [
    ...Object.keys(peerDependencies ?? {}),
    ...Object.keys(dependencies ?? {}),
].filter((name) => name !== '@gravity-ui/page-constructor');

const esmExternalsPlugin = {
    name: 'esm-externals',
    setup(build) {
        build.onResolve({filter: /.*/}, (args) => {
            if (
                args.kind === 'require-call' &&
                external.some((name) => args.path === name || args.path.startsWith(name + '/'))
            ) {
                return {path: args.path, namespace: 'esm-external'};
            }
        });
        build.onLoad({filter: /.*/, namespace: 'esm-external'}, ({path: specifier}) => ({
            contents: `import * as dependency from ${JSON.stringify(specifier)}; module.exports = dependency.default ?? dependency;`,
            loader: 'js',
            resolveDir: resolveFromPlaygroundRoot(),
        }));
    },
};

(async () => {
    const outdir = resolveFromPlaygroundRoot('bundle');

    try {
        await rm(outdir, {recursive: true});
    } catch (e) {
        if (e instanceof Error && e.code !== 'ENOENT') {
            throw new Error('failed to build pages');
        }
    }

    await mkdir(outdir, {recursive: true});

    for (const format of ['cjs', 'esm']) {
        const config = configs.ts({
            entryPoints: ['src/App/index.tsx'],
            outfile: path.join(outdir, format === 'esm' ? 'index.mjs' : 'index.js'),
        });
        await esbuild.build({
            ...config,
            plugins: [...(format === 'esm' ? [esmExternalsPlugin] : []), ...config.plugins],
            target: 'es2020',
            external,
            format,
            banner: {js: '/* eslint-disable */'},
        });
    }
})();
