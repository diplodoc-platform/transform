import {copyFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const directory = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(directory, '../../build/browser-example');
mkdirSync(outdir, {recursive: true});
await build({
    entryPoints: [resolve(directory, 'app.mjs')],
    outdir,
    entryNames: 'app',
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    splitting: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
});
copyFileSync(resolve(directory, 'index.html'), resolve(outdir, 'index.html'));
