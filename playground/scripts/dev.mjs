import {mkdir, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {context} from 'esbuild';

import {generateHTML} from '../src/index.html.mjs';

import {ts} from './configs.mjs';
import {resolveFromPlaygroundRoot} from './utils.mjs';

export const runPlaygroundInDev = async () => {
    const outdir = resolveFromPlaygroundRoot('www');

    try {
        await rm(outdir, {recursive: true});
    } catch (e) {
        if (e instanceof Error && e.code !== 'ENOENT') {
            throw new Error('failed to build dev');
        }
    }

    await mkdir(outdir, {recursive: true});

    const html = generateHTML({
        env: 'development',
        csspath: join('/', 'index.css'),
    });

    await writeFile(join(outdir, 'index.html'), html);

    const ctx = await context(
        ts({
            entryPoints: [resolveFromPlaygroundRoot('src/index.tsx')],
            outdir,
        }),
    );

    await ctx.watch();

    const {port} = await ctx.serve({
        host: '127.0.0.1',
        servedir: outdir,
    });

    // eslint-disable-next-line no-console
    console.log(`http://localhost:${port}`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await runPlaygroundInDev();
}
