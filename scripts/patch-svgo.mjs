import {spawnSync} from 'node:child_process';
import {readFileSync, realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
// Resolve the actual dependency so standalone and hoisted workspace installs agree.
const svgoRoot = dirname(dirname(realpathSync(require.resolve('svgo'))));
const {name, version} = JSON.parse(readFileSync(join(svgoRoot, 'package.json'), 'utf8'));

if (name !== 'svgo' || version !== '4.1.0') {
    throw new Error(`The SVG parser patch requires svgo@4.1.0, received ${name}@${version}`);
}

const appRoot = dirname(dirname(svgoRoot));
const result = spawnSync(
    process.execPath,
    [
        require.resolve('patch-package/index.js'),
        '--patch-dir',
        relative(appRoot, join(projectRoot, 'patches')),
        '--error-on-fail',
    ],
    {
        cwd: appRoot,
        stdio: 'inherit',
    },
);

if (result.error) {
    throw result.error;
}
if (result.status !== 0) {
    throw new Error(`Could not apply the SVG parser patch (exit ${result.status})`);
}
