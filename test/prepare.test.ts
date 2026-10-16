import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, join, resolve} from 'node:path';

const roots: string[] = [];
afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

function fixture(version?: string, patchStatus = 0) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'transform-prepare-')));
    roots.push(root);
    mkdirSync(join(root, 'scripts'));
    for (const script of ['prepare.mjs', 'patch-svgo.mjs']) {
        copyFileSync(resolve(__dirname, '../scripts', script), join(root, 'scripts', script));
    }
    const bin = join(root, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'husky'), `#!${process.execPath}\nconsole.log('HUSKY_ATTEMPTED');\n`, {
        mode: 0o755,
    });
    writeFileSync(join(bin, 'husky.cmd'), '@echo HUSKY_ATTEMPTED\r\n');
    if (version) {
        const svgo = join(root, 'node_modules/svgo');
        mkdirSync(join(svgo, 'dist'), {recursive: true});
        writeFileSync(
            join(svgo, 'package.json'),
            JSON.stringify({name: 'svgo', version, main: 'dist/svgo-node.cjs'}),
        );
        writeFileSync(join(svgo, 'dist/svgo-node.cjs'), 'module.exports = {};');
        const patch = join(root, 'node_modules/patch-package');
        mkdirSync(patch);
        writeFileSync(join(patch, 'index.js'), `process.exit(${patchStatus});`);
    }
    const env = {...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`};
    const run = (script: string) =>
        spawnSync(process.execPath, [join(root, 'scripts', script)], {encoding: 'utf8', env});
    return {run};
}

describe('install-time SVG patch and hook setup', () => {
    test.each([
        [undefined, 0],
        ['4.2.0', 0],
        ['4.1.0', 42],
    ])('keeps prepare usable but strict patching fails for %s / %s', (version, patchStatus) => {
        const {run} = fixture(version, patchStatus);
        const prepare = run('prepare.mjs');
        expect(prepare.status).toBe(0);
        expect(prepare.stdout).toContain('HUSKY_ATTEMPTED');
        expect(prepare.stderr).toContain('Skipping the install-time patch');
        expect(run('patch-svgo.mjs').status).not.toBe(0);
    });

    test('patches a supported development installation before hook setup', () => {
        const {run} = fixture('4.1.0');
        const prepare = run('prepare.mjs');
        expect(prepare.status).toBe(0);
        expect(prepare.stdout).toContain('HUSKY_ATTEMPTED');
        expect(prepare.stderr).not.toContain('Skipping');
        expect(run('patch-svgo.mjs').status).toBe(0);
    });
});
