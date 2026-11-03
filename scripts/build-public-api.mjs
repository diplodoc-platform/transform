import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

import {packageExports, publicModules} from './public-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = resolve(root, 'package.json');
const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
const modules = new Map(publicModules.map((entry) => [entry.source, entry]));
manifest.main = './public/index.cjs';
manifest.module = './public/index.mjs';
manifest.types = './public/index.d.cts';
manifest.exports = packageExports();
manifest.files = ['public', 'dist', 'lib', 'src'];
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--write-manifest')) {
    writeFileSync(packagePath, serialized);
    process.exit(0);
}
if (readFileSync(packagePath, 'utf8') !== serialized) {
    throw new Error(
        'Public exports drifted. Run node scripts/build-public-api.mjs --write-manifest.',
    );
}

// Rebuilding from the finite inventory must also remove obsolete facades.
rmSync(resolve(root, 'public'), {recursive: true, force: true});

// Derive every type and value export from compiler-emitted declarations. No API
// signatures are copied into the facades, so overloads and namespace types survive.
const files = [...modules.values()].map(({source}) => resolve(root, `lib/${source}.d.ts`));
const program = ts.createProgram(files, {
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    skipLibCheck: false,
});
const checker = program.getTypeChecker();
for (const {source, legacyDefault} of modules.values()) {
    const declaration = program.getSourceFile(resolve(root, `lib/${source}.d.ts`));
    const symbol = declaration && checker.getSymbolAtLocation(declaration);
    if (!symbol) {
        throw new Error(`Missing implementation declaration: ${source}`);
    }
    const symbols = checker.getExportsOfModule(symbol);
    const values = symbols.filter((entry) => {
        // eslint-disable-next-line no-bitwise -- TypeScript symbol kinds are bit flags.
        const target = entry.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(entry) : entry;
        // eslint-disable-next-line no-bitwise -- TypeScript symbol kinds are bit flags.
        return Boolean(target.flags & ts.SymbolFlags.Value);
    });
    const names = values.map((entry) => entry.name).filter((name) => name !== 'default');
    const hasDefault = symbols.some((entry) => entry.name === 'default');
    if (legacyDefault && !hasDefault) {
        throw new Error(`Callable adapter requires a default export: ${source}`);
    }
    const output = resolve(root, `public/${source}`);
    const implementation = relative(dirname(output), resolve(root, `lib/${source}.js`)).replaceAll(
        '\\',
        '/',
    );
    const specifier = implementation.startsWith('.') ? implementation : `./${implementation}`;
    mkdirSync(dirname(output), {recursive: true});
    const header = '// Generated from scripts/public-api.mjs and implementation declarations.\n';
    writeFileSync(
        `${output}.mjs`,
        header +
            [
                `import implementation from ${JSON.stringify(specifier)};`,
                ...names.map((name) => `export const ${name} = implementation.${name};`),
                ...(hasDefault ? ['export default implementation.default;'] : []),
                '',
            ].join('\n'),
    );
    writeFileSync(
        `${output}.cjs`,
        `${header}module.exports = require(${JSON.stringify(specifier)})${legacyDefault ? '.default' : ''};\n`,
    );
    const esmTypes =
        `export * from ${JSON.stringify(specifier)};\n` +
        (hasDefault
            ? `import implementation = require(${JSON.stringify(specifier)});\nexport default implementation.default;\n`
            : '');
    const cjsTypes =
        `export * from ${JSON.stringify(specifier)};\n` +
        (hasDefault ? `export {default} from ${JSON.stringify(specifier)};\n` : '');
    writeFileSync(`${output}.d.mts`, header + esmTypes);
    writeFileSync(
        `${output}.d.cts`,
        header +
            (legacyDefault
                ? `import implementation from ${JSON.stringify(specifier)};\nexport = implementation;\n`
                : cjsTypes),
    );
}

// A bare directory alias forwards to its canonical index facade. Both formats
// retain the canonical module's shape and state, including callable CJS values.
for (const {source, legacyDefault} of modules.values()) {
    if (!source.endsWith('/index')) continue;
    const alias = resolve(root, `public/${source.slice(0, -6)}`);
    const canonical = relative(dirname(alias), resolve(root, `public/${source}`)).replaceAll(
        '\\',
        '/',
    );
    const specifier = canonical.startsWith('.') ? canonical : `./${canonical}`;
    const declaration = program.getSourceFile(resolve(root, `lib/${source}.d.ts`));
    const hasDefault = checker
        .getExportsOfModule(checker.getSymbolAtLocation(declaration))
        .some((entry) => entry.name === 'default');
    const esm =
        `export * from '${specifier}.mjs';\n` +
        (hasDefault ? `export {default} from '${specifier}.mjs';\n` : '');
    writeFileSync(`${alias}.mjs`, esm);
    writeFileSync(`${alias}.cjs`, `module.exports = require('${specifier}.cjs');\n`);
    writeFileSync(`${alias}.d.mts`, esm);
    writeFileSync(
        `${alias}.d.cts`,
        legacyDefault
            ? `import implementation = require('${specifier}.cjs');\nexport = implementation;\n`
            : `export * from '${specifier}.cjs';\n` +
                  (hasDefault ? `export {default} from '${specifier}.cjs';\n` : ''),
    );
}

// Legacy type-only paths have separate declarations so the stable /types facade
// does not inherit the deprecation annotations.
const legacyDeclaration = program.getSourceFile(resolve(root, 'lib/typings.d.ts'));
const legacySymbol = legacyDeclaration && checker.getSymbolAtLocation(legacyDeclaration);
if (!legacySymbol) throw new Error('Missing typings declaration');
const legacyTypes = checker
    .getExportsOfModule(legacySymbol)
    .map(
        ({name}) =>
            `/** @deprecated Import from @diplodoc/transform/types. Removal: 6.0.0. */\nexport type {${name}} from '../lib/typings.js';\n`,
    )
    .join('');
writeFileSync(resolve(root, 'public/legacy-typings.d.mts'), legacyTypes);
writeFileSync(resolve(root, 'public/legacy-typings.d.cts'), legacyTypes);
