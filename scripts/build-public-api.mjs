import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

import {browserEntries, legacyModules, stableEntries, staticEntries} from './public-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = resolve(root, 'package.json');
const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
// Newly introduced stable modules are not automatically compatibility aliases.
const modules = new Map(legacyModules.map((entry) => [entry.source, entry]));
for (const source of Object.values(stableEntries)) {
    if (!modules.has(source)) {
        modules.set(source, {source});
    }
}
const moduleExport = (source) => ({
    import: {types: `./api/${source}.d.mts`, default: `./api/${source}.mjs`},
    require: {types: `./api/${source}.d.cts`, default: `./api/${source}.cjs`},
});
const exports = Object.fromEntries(
    Object.entries(stableEntries).map(([name, source]) => [name, moduleExport(source)]),
);
for (const [name, source] of Object.entries(browserEntries)) {
    exports[name] = {
        import: {types: `./dist/browser/${source}.d.mts`, default: `./dist/browser/${source}.mjs`},
    };
}
for (const {source} of legacyModules) {
    const entry = moduleExport(source);
    exports[`./lib/${source}`] = entry;
    exports[`./lib/${source}.js`] = entry;
    if (source.endsWith('/index')) {
        exports[`./lib/${source.slice(0, -6)}`] = entry;
    }
}
exports['./lib'] = moduleExport('index');
Object.assign(exports, staticEntries);
manifest.main = './api/index.cjs';
manifest.module = './api/index.mjs';
manifest.types = './api/index.d.cts';
manifest.exports = exports;
manifest.files = ['api', 'dist', 'lib', 'src'];
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
    const output = resolve(root, `api/${source}`);
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
