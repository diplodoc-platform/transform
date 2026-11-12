import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

import {writeBundledLicenses} from './bundled-licenses.mjs';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const result = await build({
    absWorkingDir: projectRoot,
    entryPoints: ['src/transform/svgo.ts'],
    outfile: 'lib/svgo.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    metafile: true,
    legalComments: 'eof',
});

writeBundledLicenses(result.metafile, projectRoot, join(projectRoot, 'lib/svgo.LICENSES.txt'));
