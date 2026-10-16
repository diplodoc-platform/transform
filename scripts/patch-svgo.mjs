import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
function applyPatch() {
    // Resolve the actual dependency so standalone and hoisted workspace installs agree.
    const svgoRoot = dirname(dirname(realpathSync(require.resolve('svgo'))));
    const {name, version} = JSON.parse(readFileSync(join(svgoRoot, 'package.json'), 'utf8'));

    if (name !== 'svgo' || version !== '4.1.0') {
        throw new Error(`The SVG parser patch requires svgo@4.1.0, received ${name}@${version}`);
    }

    const svgoRequire = createRequire(join(svgoRoot, 'package.json'));
    const saxRoot = dirname(dirname(realpathSync(svgoRequire.resolve('sax'))));
    const sax = JSON.parse(readFileSync(join(saxRoot, 'package.json'), 'utf8'));
    if (sax.name !== 'sax' || sax.version !== '1.6.1') {
        throw new Error(
            `The SVG buffer patch requires sax@1.6.1, received ${sax.name}@${sax.version}`,
        );
    }

    // npm can hoist SAX independently of SVGO. Apply each patch at its resolved root.
    const patches = [
        {root: saxRoot, file: 'sax+1.6.1.patch'},
        {root: svgoRoot, file: 'svgo+4.1.0.patch'},
    ];
    for (const {root, file} of patches) {
        const appRoot = dirname(dirname(root));
        // Keep the temporary patch on the same volume for relative Windows paths.
        const temporaryRoot = mkdtempSync(join(appRoot, 'node_modules', '.diplodoc-svg-patches-'));
        try {
            copyFileSync(join(projectRoot, 'patches', file), join(temporaryRoot, file));
            const result = spawnSync(
                process.execPath,
                [
                    require.resolve('patch-package/index.js'),
                    '--patch-dir',
                    relative(appRoot, temporaryRoot),
                    '--error-on-fail',
                ],
                {cwd: appRoot, stdio: 'inherit'},
            );
            if (result.error) {
                throw result.error;
            }
            if (result.status !== 0) {
                throw new Error(`Could not apply ${file} (exit ${result.status})`);
            }
        } finally {
            rmSync(temporaryRoot, {recursive: true, force: true});
        }
    }
}

try {
    applyPatch();
} catch (error) {
    if (!process.argv.includes('--optional')) {
        throw error;
    }
    // eslint-disable-next-line no-console
    console.warn(
        `[svgo] Skipping the install-time patch: ${error.message}. Building or packing requires npm run patch:svgo to succeed.`,
    );
}
