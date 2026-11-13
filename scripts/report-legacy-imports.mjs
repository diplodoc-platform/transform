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
        if (forbidden(file)) {
            throw new Error(`Refusing non-source path: ${file}`);
        }
        return file;
    })
    .map((file) => resolve(file))
    .sort();
if (!files.length) {
    throw new Error('Pass explicit JS/TS source files; optionally add --write');
}
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

function scriptKind(extension) {
    if (extension === '.tsx') {
        return ts.ScriptKind.TSX;
    }
    if (extension === '.jsx') {
        return ts.ScriptKind.JSX;
    }
    if (['.js', '.cjs', '.mjs'].includes(extension)) {
        return ts.ScriptKind.JS;
    }
    return ts.ScriptKind.TS;
}

function isTypeOnlyDeclaration(node) {
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
    return Boolean(
        node.importClause?.isTypeOnly || node.isTypeOnly || allImportTypes || allExportTypes,
    );
}

function moduleReference(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        return {literal: node.moduleSpecifier, safe: isTypeOnlyDeclaration(node)};
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
        return {literal: node.argument.literal, safe: true};
    }
    if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
        return {literal: node.arguments[0], safe: false};
    }
    return undefined;
}

function collectIdentifiers(tree) {
    const identifiers = new Set();
    const identifierNodes = [];
    const collect = (node) => {
        if (ts.isIdentifier(node)) {
            identifiers.add(node.text);
            identifierNodes.push(node);
        }
        ts.forEachChild(node, collect);
    };
    collect(tree);
    return {identifiers, identifierNodes};
}

function isSafeCallbackReference(identifier, binding) {
    if (identifier.text !== binding.text || identifier === binding) {
        return true;
    }
    const parent = identifier.parent;
    if (
        ts.isCallExpression(parent) &&
        parent.arguments[0] === identifier &&
        // Wrapper invocation options may configure factory-only behavior.
        parent.arguments.length === 1 &&
        ts.isPropertyAccessExpression(parent.expression) &&
        parent.expression.name.text === 'use'
    ) {
        return true;
    }
    return Boolean(
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === identifier &&
        parent.name.text === 'collect' &&
        ts.isCallExpression(parent.parent) &&
        parent.parent.expression === parent,
    );
}

function isSimpleCallback(node, path, context) {
    const {invalid, tree, imports, identifierNodes} = context;
    if (invalid || !callbacks.has(path) || !ts.isImportDeclaration(node)) {
        return false;
    }
    // A sole default import avoids moving a factory call past other imports.
    if (tree.statements[0] !== node || imports.length !== 1) {
        return false;
    }
    if (
        tree.statements.some(
            (statement) => ts.isExportDeclaration(statement) && statement.moduleSpecifier,
        )
    ) {
        return false;
    }
    const clause = node.importClause;
    if (!clause?.name || clause.namedBindings || clause.isTypeOnly || node.attributes) {
        return false;
    }
    return (
        identifierNodes.every((identifier) => isSafeCallbackReference(identifier, clause.name)) &&
        !/\/\*|\/\//.test(node.getText(tree))
    );
}

function migrationAction(path, canEdit, simpleCallback) {
    if (canEdit) {
        return 'replace with /types';
    }
    if (simpleCallback) {
        return 'replace with configured direct extension factory; declare dependency';
    }
    if (callbacks.has(path)) {
        return 'manual: use the configured direct extension factory';
    }
    if (aliases.has(path)) {
        return 'manual: establish type-only usage';
    }
    return 'manual: review legacy path';
}

function callbackEdit(node, path, context) {
    const feature = path.includes('cut') ? 'cut' : 'tabs';
    let factory = feature === 'cut' ? 'createCut' : 'createTabs';
    while (context.identifiers.has(factory)) {
        factory += '_';
    }
    const config =
        feature === 'cut'
            ? "{bundle: false, directiveSyntax: 'disabled'}"
            : '{bundle: false, features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}}}';
    return {
        start: node.getStart(context.tree),
        end: node.getEnd(),
        text: `import {transform as ${factory}} from '@diplodoc/${feature}-extension';\nconst ${node.importClause.name.text} = ${factory}(${config});`,
    };
}

function reportReference(node, literal, safe, context) {
    const path = literal.text.slice(prefix.length);
    if (!aliases.has(path) && !callbacks.has(path) && !path.startsWith('lib/')) {
        return;
    }
    const {tree, file, invalid, edits} = context;
    const {line, character} = tree.getLineAndCharacterOfPosition(literal.getStart(tree));
    const canEdit = !invalid && aliases.has(path) && safe;
    const simpleCallback = isSimpleCallback(node, path, context);
    process.stdout.write(
        `${file}:${line + 1}:${character + 1}: ${literal.text}: ${migrationAction(path, canEdit, simpleCallback)}\n`,
    );
    if (canEdit) {
        edits.push({
            start: literal.getStart(tree) + 1,
            end: literal.getEnd() - 1,
            text: `${prefix}types`,
        });
    }
    if (simpleCallback) {
        edits.push(callbackEdit(node, path, context));
    }
}

for (const file of files) {
    if (!/\.(?:[cm]?[jt]sx?)$/.test(file) || forbidden(file)) {
        throw new Error(`Refusing non-source path: ${file}`);
    }
    const source = readFileSync(file, 'utf8');
    const kind = scriptKind(extname(file).toLowerCase());
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
    const invalid = tree.parseDiagnostics.length > 0;
    for (const diagnostic of tree.parseDiagnostics) {
        const {line, character} = tree.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
        process.stderr.write(
            `${file}:${line + 1}:${character + 1}: parse error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}; no changes applied\n`,
        );
    }
    if (invalid && write) {
        process.exitCode = 1;
    }
    const edits = [];
    const context = {
        file,
        tree,
        invalid,
        edits,
        imports: tree.statements.filter(ts.isImportDeclaration),
        ...collectIdentifiers(tree),
    };
    const visit = (node) => {
        const reference = moduleReference(node);
        if (reference) {
            const {literal, safe} = reference;
            if (literal && ts.isStringLiteral(literal) && literal.text.startsWith(prefix)) {
                reportReference(node, literal, safe, context);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(tree);
    let result = source;
    for (const edit of edits.reverse()) {
        result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    }
    if (write && result !== source) {
        writeFileSync(file, result);
    } else if (!write && result !== source) {
        process.stdout.write(`--- ${file}\n+++ ${file} (proposed)\n${result}\n`);
    }
}
