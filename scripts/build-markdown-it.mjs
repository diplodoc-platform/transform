import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

import {writeBundledLicenses} from './bundled-licenses.mjs';
import {markdownItSourcesPlugin} from './markdown-it-sources.mjs';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// Preserve native Token field definitions instead of the legacy distribution's
// per-instance defineProperty helpers. Upstream sources and parser rules are unchanged.
const result = await build({
    absWorkingDir: projectRoot,
    entryPoints: ['src/transform/markdown-it-runtime.ts'],
    outfile: 'lib/markdown-it-runtime.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'es2022',
    sourcemap: true,
    metafile: true,
    legalComments: 'eof',
    plugins: [markdownItSourcesPlugin()],
});
writeBundledLicenses(
    result.metafile,
    projectRoot,
    join(projectRoot, 'lib/markdown-it-runtime.LICENSES.txt'),
);
