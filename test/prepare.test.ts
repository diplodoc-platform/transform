import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, join, resolve} from 'node:path';

const roots: string[] = [];
afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

function fixture(version?: string, patchStatus = 0, saxVersion: string | null = '1.6.1') {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'transform-prepare-')));
    roots.push(root);
    mkdirSync(join(root, 'scripts'));
    for (const script of ['prepare.mjs', 'patch-svgo.mjs']) {
        copyFileSync(resolve(__dirname, '../scripts', script), join(root, 'scripts', script));
    }
    mkdirSync(join(root, 'patches'));
    for (const patch of ['svgo+4.1.0.patch', 'sax+1.6.1.patch']) {
        copyFileSync(resolve(__dirname, '../patches', patch), join(root, 'patches', patch));
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
        if (saxVersion) {
            const sax = join(root, 'node_modules/sax');
            mkdirSync(join(sax, 'lib'), {recursive: true});
            writeFileSync(
                join(sax, 'package.json'),
                JSON.stringify({name: 'sax', version: saxVersion, main: 'lib/sax.js'}),
            );
            writeFileSync(join(sax, 'lib/sax.js'), 'module.exports = {};');
        }
        const patch = join(root, 'node_modules/patch-package');
        mkdirSync(patch);
        writeFileSync(
            join(patch, 'index.js'),
            `console.log(require('node:fs').readdirSync(process.argv[process.argv.indexOf('--patch-dir') + 1]).join(','));\nprocess.exit(${patchStatus});`,
        );
    }
    const env = {...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`};
    const run = (script: string) =>
        spawnSync(process.execPath, [join(root, 'scripts', script)], {encoding: 'utf8', env});
    return {run};
}

describe('install-time SVG patch and hook setup', () => {
    test.each([
        [undefined, 0, '1.6.1'],
        ['4.2.0', 0, '1.6.1'],
        ['4.1.0', 42, '1.6.1'],
        ['4.1.0', 0, null],
        ['4.1.0', 0, '1.7.0'],
    ])(
        'keeps prepare usable but strict patching fails for %s / %s / %s',
        (version, patchStatus, saxVersion) => {
            const {run} = fixture(version, patchStatus, saxVersion);
            const prepare = run('prepare.mjs');
            expect(prepare.status).toBe(0);
            expect(prepare.stdout).toContain('HUSKY_ATTEMPTED');
            expect(prepare.stderr).toContain('Skipping the install-time patch');
            expect(run('patch-svgo.mjs').status).not.toBe(0);
        },
    );

    test('patches a supported development installation before hook setup', () => {
        const {run} = fixture('4.1.0');
        const prepare = run('prepare.mjs');
        expect(prepare.status).toBe(0);
        expect(prepare.stdout).toContain('HUSKY_ATTEMPTED');
        expect(prepare.stdout).toContain('sax+1.6.1.patch');
        expect(prepare.stdout).toContain('svgo+4.1.0.patch');
        expect(prepare.stderr).not.toContain('Skipping');
        expect(run('patch-svgo.mjs').status).toBe(0);
    });
});
