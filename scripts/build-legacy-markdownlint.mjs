import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

import {writeBundledLicenses} from './bundled-licenses.mjs';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const result = await build({
    absWorkingDir: projectRoot,
    entryPoints: ['src/transform/yfmlint/legacy-markdownlint.ts'],
    outfile: 'lib/yfmlint/legacy-markdownlint.js',
    bundle: true,
    external: ['markdown-it'],
    platform: 'node',
    format: 'cjs',
    target: 'node24',
    sourcemap: true,
    metafile: true,
    legalComments: 'eof',
});

writeBundledLicenses(
    result.metafile,
    projectRoot,
    join(projectRoot, 'lib/yfmlint/legacy-markdownlint.LICENSES.txt'),
);
