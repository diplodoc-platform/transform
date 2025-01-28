import {mkdir, rm} from 'fs/promises';
import {join} from 'path';
import {build} from 'esbuild';

import {dependencies, devDependencies, peerDependencies} from '../package.json';

import {ts} from './configs.js';

const external = [
    ...Object.keys(peerDependencies ?? {}),
    ...Object.keys(devDependencies ?? {}),
    ...Object.keys(dependencies ?? {}),
];

(async () => {
    const outdir = 'bundle';

    try {
        await rm(outdir, {recursive: true});
    } catch (e) {
        if (e instanceof Error && e.code !== 'ENOENT') {
            throw new Error('failed to build pages');
        }
    }

    await mkdir(outdir, {recursive: true});

    await build({
        ...ts({
            entryPoints: ['src/App/index.tsx'],
            outfile: join(outdir, 'index.js'),
        }),
        target: 'es2020',
        external,
        format: 'cjs',
        banner: {js: '/* eslint-disable */'},
    });
})();
