#!/usr/bin/env node
// Deliberately bounded: accept explicit source files only, never traverse directories.
import {readFileSync, writeFileSync} from 'node:fs';
import {extname, resolve} from 'node:path';
import ts from 'typescript';

const args = process.argv.slice(2);
const write = args.includes('--write');
const inputFiles = args.filter((arg) => arg !== '--write');
const forbidden = (path) =>
    /(?:^|\/)(?:node_modules|dist|build|lib)(?:\/|$)/.test(path.replaceAll('\\', '/'));
const files = inputFiles
    .map((file) => {
        if (forbidden(file)) throw new Error(`Refusing non-source path: ${file}`);
        return file;
    })
    .map((file) => resolve(file))
    .sort();
if (!files.length) throw new Error('Pass explicit JS/TS source files; optionally add --write');
const aliases = new Set([
    'lib/typings',
    'lib/typings.js',
    'lib/plugins/typings',
    'lib/plugins/typings.js',
]);
const callbacks = new Set([
    'plugins/cut',
    'plugins/tabs',
    'lib/plugins/cut',
    'lib/plugins/cut.js',
    'lib/plugins/tabs',
    'lib/plugins/tabs.js',
]);
const prefix = '@diplodoc/transform/';
for (const file of files) {
    if (!/\.(?:[cm]?[jt]sx?)$/.test(file) || forbidden(file)) {
        throw new Error(`Refusing non-source path: ${file}`);
    }
    const source = readFileSync(file, 'utf8');
    const extension = extname(file).toLowerCase();
    const kind =
        extension === '.tsx'
            ? ts.ScriptKind.TSX
            : extension === '.jsx'
              ? ts.ScriptKind.JSX
              : ['.js', '.cjs', '.mjs'].includes(extension)
                ? ts.ScriptKind.JS
                : ts.ScriptKind.TS;
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
    const invalid = tree.parseDiagnostics.length > 0;
    for (const diagnostic of tree.parseDiagnostics) {
        const {line, character} = tree.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
        process.stderr.write(
            `${file}:${line + 1}:${character + 1}: parse error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}; no changes applied\n`,
        );
    }
    if (invalid && write) process.exitCode = 1;
    const edits = [];
    const imports = tree.statements.filter(ts.isImportDeclaration);
    const identifiers = new Set();
    const identifierNodes = [];
    const collectIdentifiers = (node) => {
        if (ts.isIdentifier(node)) {
            identifiers.add(node.text);
            identifierNodes.push(node);
        }
        ts.forEachChild(node, collectIdentifiers);
    };
    collectIdentifiers(tree);
    const visit = (node) => {
        let literal;
        let safe = false;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            literal = node.moduleSpecifier;
            const bindings = node.importClause?.namedBindings;
            const allImportTypes =
                bindings &&
                ts.isNamedImports(bindings) &&
                !node.importClause.name &&
                bindings.elements.length > 0 &&
                bindings.elements.every((element) => element.isTypeOnly);
            const allExportTypes =
                node.exportClause &&
                ts.isNamedExports(node.exportClause) &&
                node.exportClause.elements.length > 0 &&
                node.exportClause.elements.every((element) => element.isTypeOnly);
            safe = Boolean(
                node.importClause?.isTypeOnly ||
                node.isTypeOnly ||
                allImportTypes ||
                allExportTypes,
            );
        } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
            literal = node.argument.literal;
            safe = true;
        } else if (
            ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
        ) {
            literal = node.arguments[0];
        }
        if (literal && ts.isStringLiteral(literal) && literal.text.startsWith(prefix)) {
            const path = literal.text.slice(prefix.length);
            if (aliases.has(path) || callbacks.has(path) || path.startsWith('lib/')) {
                const {line, character} = tree.getLineAndCharacterOfPosition(
                    literal.getStart(tree),
                );
                const canEdit = !invalid && aliases.has(path) && safe;
                // A sole default import avoids moving a factory call past other imports.
                const simpleCallback =
                    !invalid &&
                    callbacks.has(path) &&
                    ts.isImportDeclaration(node) &&
                    tree.statements[0] === node &&
                    imports.length === 1 &&
                    !tree.statements.some(
                        (statement) =>
                            ts.isExportDeclaration(statement) && statement.moduleSpecifier,
                    ) &&
                    node.importClause?.name &&
                    !node.importClause.namedBindings &&
                    !node.importClause.isTypeOnly &&
                    !node.attributes &&
                    identifierNodes.every((identifier) => {
                        if (
                            identifier.text !== node.importClause.name.text ||
                            identifier === node.importClause.name
                        )
                            return true;
                        const parent = identifier.parent;
                        if (
                            ts.isCallExpression(parent) &&
                            parent.arguments[0] === identifier &&
                            ts.isPropertyAccessExpression(parent.expression) &&
                            parent.expression.name.text === 'use'
                        )
                            return true;
                        if (
                            ts.isPropertyAccessExpression(parent) &&
                            parent.expression === identifier &&
                            parent.name.text === 'collect' &&
                            ts.isCallExpression(parent.parent) &&
                            parent.parent.expression === parent
                        )
                            return true;
                        return false;
                    }) &&
                    !/\/\*|\/\//.test(node.getText(tree));
                const action = canEdit
                    ? 'replace with /types'
                    : simpleCallback
                      ? 'replace with configured direct extension factory; declare dependency'
                      : callbacks.has(path)
                        ? 'manual: use the configured direct extension factory'
                        : aliases.has(path)
                          ? 'manual: establish type-only usage'
                          : 'manual: review legacy path';
                process.stdout.write(
                    `${file}:${line + 1}:${character + 1}: ${literal.text}: ${action}\n`,
                );
                if (canEdit)
                    edits.push({
                        start: literal.getStart(tree) + 1,
                        end: literal.getEnd() - 1,
                        text: `${prefix}types`,
                    });
                if (simpleCallback) {
                    const feature = path.includes('cut') ? 'cut' : 'tabs';
                    let factory = feature === 'cut' ? 'createCut' : 'createTabs';
                    while (identifiers.has(factory)) factory += '_';
                    const config =
                        feature === 'cut'
                            ? "{bundle: false, directiveSyntax: 'disabled'}"
                            : '{bundle: false, features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}}}';
                    edits.push({
                        start: node.getStart(tree),
                        end: node.getEnd(),
                        text: `import {transform as ${factory}} from '@diplodoc/${feature}-extension';\nconst ${node.importClause.name.text} = ${factory}(${config});`,
                    });
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(tree);
    let result = source;
    for (const edit of edits.reverse())
        result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    if (write && result !== source) writeFileSync(file, result);
    else if (!write && result !== source)
        process.stdout.write(`--- ${file}\n+++ ${file} (proposed)\n${result}\n`);
}
