import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const patch = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./patch-svgo.mjs', import.meta.url)), '--optional'],
    {stdio: 'inherit'},
);
// Always try the existing hook setup, including installations without dev dependencies.
spawnSync('husky', {shell: true, stdio: 'inherit'});
if (patch.error) {
    throw patch.error;
}
if (patch.status !== 0) {
    process.exitCode = patch.status ?? 1;
}
