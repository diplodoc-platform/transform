import {createRequire} from 'node:module';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const svgoRoot = resolve(dirname(require.resolve('svgo')), '..');
const inputRoot = resolve(svgoRoot, 'types');
const outputRoot = resolve(root, 'lib/vendor/svgo');
const seen = new Set();

function copyDeclaration(path) {
    if (seen.has(path)) {
        return;
    }
    seen.add(path);
    const content = readFileSync(path, 'utf8');
    for (const {fileName} of ts.preProcessFile(content).importedFiles) {
        if (!fileName.startsWith('.')) {
            throw new Error(`Bundled SVGO declaration has an external dependency: ${fileName}`);
        }
        copyDeclaration(resolve(dirname(path), fileName.replace(/\.js$/, '.d.ts')));
    }
    const target = resolve(outputRoot, relative(inputRoot, path));
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content);
}

// Preserve the exact upstream signatures with the matching bundled implementation.
// Only the reachable declaration graph is shipped; no registry SVGO is required.
copyDeclaration(resolve(inputRoot, 'lib/svgo-node.d.ts'));
writeFileSync(resolve(outputRoot, 'package.json'), '{"type":"module"}\n');
const declarationPath = resolve(root, 'lib/svgo.d.ts');
const declaration = readFileSync(declarationPath, 'utf8')
    .replace(/(['"])svgo\1/g, "'./vendor/svgo/lib/svgo-node.js'")
    .replace(/(['"])svgo\/browser\1/g, "'./vendor/svgo/lib/svgo.js'");
writeFileSync(declarationPath, declaration);

const markdownlintTypes = dirname(require.resolve('markdownlint'));
const lintOutput = resolve(root, 'lib/yfmlint/vendor');
mkdirSync(lintOutput, {recursive: true});
for (const file of ['markdownlint.d.ts', 'configuration.d.ts']) {
    copyFileSync(resolve(markdownlintTypes, file), resolve(lintOutput, file));
}
const lintDeclaration = resolve(root, 'lib/yfmlint/legacy-markdownlint.d.ts');
writeFileSync(
    lintDeclaration,
    readFileSync(lintDeclaration, 'utf8').replace(
        /(['"])markdownlint\1/g,
        "'./vendor/markdownlint'",
    ),
);
