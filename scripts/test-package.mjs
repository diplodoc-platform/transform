import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = realpathSync(mkdtempSync(join(tmpdir(), 'diplodoc-svgo-package-')));

try {
    // The build has already applied the patch. Disable hooks to inspect exactly that artifact.
    const packed = JSON.parse(
        execFileSync(
            process.execPath,
            [
                process.env.npm_execpath,
                'pack',
                '--json',
                '--ignore-scripts',
                '--pack-destination',
                temporaryRoot,
            ],
            {
                cwd: projectRoot,
                encoding: 'utf8',
                env: {...process.env, npm_config_cache: join(temporaryRoot, 'cache')},
            },
        ),
    );
    const extractedRoot = join(temporaryRoot, 'extracted');
    mkdirSync(extractedRoot);
    execFileSync('tar', ['-xzf', join(temporaryRoot, packed[0].filename), '-C', extractedRoot]);

    const packageRoot = join(extractedRoot, 'package');
    const require = createRequire(join(packageRoot, 'package.json'));
    const svgoRoot = join(packageRoot, 'node_modules/svgo');
    const {version} = JSON.parse(readFileSync(join(svgoRoot, 'package.json'), 'utf8'));
    assert.equal(version, '4.1.0');
    assert.equal(require.resolve('svgo'), join(svgoRoot, 'dist/svgo-node.cjs'));

    const esm = await import(pathToFileURL(join(svgoRoot, 'lib/svgo-node.js')));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" content="${'&#10;'.repeat(800)}"><path d="M0 0h10"/></svg>`;

    for (const {optimize} of [require('svgo'), esm]) {
        assert.throws(() => optimize(svg), /Parsed entity count exceeds max entity count/);
        assert.match(optimize(svg, {maxEntityCount: 100_000, multipass: true}).data, /<svg/);
        assert.throws(() => optimize(svg), /Parsed entity count exceeds max entity count/);
        assert.throws(
            () => optimize(svg, {maxEntityCount: 1}),
            /Parsed entity count exceeds max entity count/,
        );
    }

    // eslint-disable-next-line no-console
    console.log(
        'The npm tarball includes patched SVGO 4.1.0 and its dependencies (ESM and CommonJS).',
    );
} finally {
    rmSync(temporaryRoot, {recursive: true, force: true});
}
