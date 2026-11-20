import {copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';

const directory = import.meta.dirname;
const outdir = process.argv[2] ?? resolve(directory, '../../../build/html-extension-example');
await build({
    entryPoints: [resolve(directory, 'app.mjs')],
    outdir,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    plugins: [
        {
            name: 'css-without-source-maps',
            setup({onResolve}) {
                // The HTML extension currently imports the Node sanitizer entry.
                // Use the CSS parser and plain serializer without filesystem source maps.
                onResolve({filter: /^css$/}, () => ({path: resolve(directory, 'css.mjs')}));
            },
        },
    ],
});
await copyFile(resolve(directory, 'index.html'), resolve(outdir, 'index.html'));
