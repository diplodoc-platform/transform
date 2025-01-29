import {mkdir, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {build} from 'esbuild';

import {generateHTML} from '../src/index.html.mjs';

import {ts} from './configs.mjs';
import {resolveFromPlaygroundRoot} from './utils.mjs';

export const bundleDeployables = async (path) => {
    const cwdResolvedPath = resolve(path);

    try {
        await rm(cwdResolvedPath, {recursive: true});
    } catch (e) {
        if (e instanceof Error && e.code !== 'ENOENT') {
            throw new Error('failed to build pages');
        }
    }

    await mkdir(cwdResolvedPath, {recursive: true});

    const html = generateHTML({
        env: 'production',
    });

    await writeFile(join(cwdResolvedPath, 'index.html'), html);

    await build(
        ts({
            entryPoints: [resolveFromPlaygroundRoot('src/index.tsx')],
            outfile: join(cwdResolvedPath, 'index.js'),
        }),
    );
};
