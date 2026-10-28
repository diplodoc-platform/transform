import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Verify real installed browser declarations and closed ordinary bundler graphs.
 * @param {string} consumerRoot - Outside-workspace installed package fixture.
 * @param {string} compiler - The real TypeScript compiler executable.
 * @param {Function} buildSync - Ordinary esbuild API, with no resolver overrides.
 * @returns {void} Nothing; failed assertions throw.
 */
export function verifyBrowserPackage(consumerRoot, compiler, buildSync) {
    copyFileSync(
        fileURLToPath(new URL('./browser-package-types.mts.txt', import.meta.url)),
        join(consumerRoot, 'browser-types.mts'),
    );
    const config = {
        compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022', 'DOM'],
            types: [],
            strict: true,
            skipLibCheck: false,
            noEmit: true,
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
        },
        files: ['browser-types.mts'],
    };
    const configPath = join(consumerRoot, 'browser-tsconfig.json');
    for (const mode of ['NodeNext', 'Bundler']) {
        config.compilerOptions.module = mode === 'Bundler' ? 'Preserve' : mode;
        config.compilerOptions.moduleResolution = mode;
        writeFileSync(configPath, JSON.stringify(config));
        const trace = execFileSync(process.execPath, [compiler, '-p', configPath, '--listFiles'], {
            encoding: 'utf8',
        });
        writeFileSync(join(consumerRoot, `browser-types-${mode}.log`), trace);
        assert.doesNotMatch(trace, /node_modules[/\\]@types[/\\]node[/\\]/);
        assert.equal(
            trace.split('\n').filter((path) => path.endsWith('/lib/shared-types.d.ts')).length,
            1,
        );
    }
    writeFileSync(
        join(consumerRoot, 'browser-augmentation.mts'),
        `
import {type ParserEnv as NodeEnv} from '@diplodoc/transform/types';
import {type DocumentEnv as NodeDocument} from '@diplodoc/transform/document';
import {createParser, type ParserEnv, type DocumentEnv, type ParsedDocumentFragment} from '@diplodoc/transform/browser';
import {type ParserEnv as MinimalEnv, type ParsedDocumentFragment as MinimalFragment} from '@diplodoc/transform/browser/minimal';
declare module '@diplodoc/transform/types' {interface ParserEnv {consumerField: {owned: true}}}
declare module '@diplodoc/transform/document' {interface DocumentEnv {documentField: {owned: true}}}
declare const node: NodeEnv;
declare const nodeDocument: NodeDocument;
declare const browser: ParserEnv;
declare const minimal: MinimalEnv;
declare const fragment: ParsedDocumentFragment;
const fromNode: ParserEnv = node;
const toNode: NodeEnv = browser;
const fromMinimal: ParserEnv = minimal;
const fromNodeDocument: DocumentEnv = nodeDocument;
const toMinimal: MinimalFragment = fragment;
createParser().parseDocument('text', env => {
    const consumerField: {owned: true} = env.consumerField;
    const documentField: {owned: true} = env.documentField;
    void [consumerField, documentField];
});
void [fromNode, toNode, fromMinimal, fromNodeDocument, toMinimal];
`,
    );
    config.compilerOptions.module = 'NodeNext';
    config.compilerOptions.moduleResolution = 'NodeNext';
    config.compilerOptions.types = ['node'];
    config.files = ['browser-augmentation.mts'];
    writeFileSync(configPath, JSON.stringify(config));
    execFileSync(process.execPath, [compiler, '-p', configPath], {stdio: 'inherit'});
    const report = {};
    for (const entry of ['browser', 'browser/minimal']) {
        const result = buildSync({
            absWorkingDir: consumerRoot,
            stdin: {
                contents: `import transform from '@diplodoc/transform/${entry}'; globalThis.transform = transform;`,
                resolveDir: consumerRoot,
            },
            bundle: true,
            platform: 'browser',
            format: 'esm',
            write: false,
            metafile: true,
        });
        assert.deepEqual(
            Object.values(result.metafile.outputs).flatMap(({imports}) => imports),
            [],
        );
        const code = result.outputFiles[0].text;
        assert.doesNotMatch(
            code,
            /(?:require|import)\(["'](?:node:|fs["']|path["']|highlight\.js)/,
        );
        report[entry] = {
            bytes: result.outputFiles[0].contents.length,
            inputs: Object.keys(result.metafile.inputs),
        };
    }
    writeFileSync(
        join(consumerRoot, 'browser-package-graphs.json'),
        JSON.stringify(report, null, 2),
    );
    assert.ok(readFileSync(join(consumerRoot, 'browser-types-NodeNext.log')).length);
}
