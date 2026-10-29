import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const script = resolve('scripts/report-legacy-imports.mjs');

test('reports locations, preserves unsafe forms and is idempotent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'legacy-imports-'));
    const file = join(directory, 'sample.ts');
    try {
        const original = [
            "import type {OptionsType} from '@diplodoc/transform/lib/typings';",
            "const cut = require('@diplodoc/transform/plugins/cut');",
            '',
        ].join('\n');
        writeFileSync(file, original);
        const report = execFileSync('node', [script, file], {encoding: 'utf8'});
        expect(report).toContain(`${file}:1:32`);
        expect(report).toContain(`${file}:2:21`);
        expect(report).toContain('manual:');
        expect(readFileSync(file, 'utf8')).toBe(original);
        execFileSync('node', [script, '--write', file]);
        const migrated = readFileSync(file, 'utf8');
        expect(migrated).toContain("import type {OptionsType} from '@diplodoc/transform/types'");
        expect(migrated).toContain("require('@diplodoc/transform/plugins/cut')");
        execFileSync('node', [script, '--write', file]);
        expect(readFileSync(file, 'utf8')).toBe(migrated);
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});

test('rewrites a sole default callback with a collision-free factory', () => {
    const directory = mkdtempSync(join(tmpdir(), 'legacy-imports-'));
    const file = join(directory, 'sample.ts');
    try {
        writeFileSync(
            file,
            "import cut from '@diplodoc/transform/plugins/cut';\nconst createCut = 1;\nmd.use(cut);\n",
        );
        execFileSync('node', [script, '--write', file]);
        const result = readFileSync(file, 'utf8');
        expect(result).toContain("import {transform as createCut_} from '@diplodoc/cut-extension'");
        expect(result).toContain("createCut_({bundle: false, directiveSyntax: 'disabled'})");
        expect(result).toContain('md.use(cut);');
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});

test('does not move a callback factory past earlier executable code', () => {
    const directory = mkdtempSync(join(tmpdir(), 'legacy-imports-'));
    const file = join(directory, 'sample.ts');
    try {
        const source =
            "sideEffect();\nimport cut from '@diplodoc/transform/plugins/cut';\nmd.use(cut);\n";
        writeFileSync(file, source);
        const report = execFileSync('node', [script, '--write', file], {encoding: 'utf8'});
        expect(report).toContain(`${file}:2:17`);
        expect(report).toContain('manual:');
        expect(readFileSync(file, 'utf8')).toBe(source);
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});

test('refuses to write malformed files and reports the parse location', () => {
    const directory = mkdtempSync(join(tmpdir(), 'legacy-imports-'));
    const file = join(directory, 'sample.ts');
    try {
        const source =
            "import type {OptionsType} from '@diplodoc/transform/lib/typings';\nconst broken = ;\n";
        writeFileSync(file, source);
        const result = spawnSync('node', [script, '--write', file], {encoding: 'utf8'});
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${file}:2:`);
        expect(result.stderr).toContain('parse error');
        expect(readFileSync(file, 'utf8')).toBe(source);
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});

test.each(['node_modules', 'dist', 'build', 'lib'])(
    'rejects Windows separators in %s paths',
    (segment) => {
        const result = spawnSync(
            'node',
            [script, '--write', `C:\\project\\${segment}\\sample.ts`],
            {encoding: 'utf8'},
        );
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Refusing non-source path');
    },
);

test.each(['js', 'cjs', 'mjs'])('reports and migrates a normal %s callback import', (extension) => {
    const directory = mkdtempSync(join(tmpdir(), 'legacy-imports-'));
    const file = join(directory, `sample.${extension}`);
    try {
        const source = "import tabs from '@diplodoc/transform/plugins/tabs';\nmd.use(tabs);\n";
        writeFileSync(file, source);
        const report = execFileSync('node', [script, file], {encoding: 'utf8'});
        expect(report).toContain(`${file}:1:18`);
        expect(report).toContain('configured direct extension factory');
        expect(readFileSync(file, 'utf8')).toBe(source);
        execFileSync('node', [script, '--write', file]);
        expect(readFileSync(file, 'utf8')).toContain("from '@diplodoc/tabs-extension'");
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});
