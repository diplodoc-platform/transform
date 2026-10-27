import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

/**
 * Verify the installed import graph without claiming a browser-safe Transform entry.
 * @param {string} consumerRoot - Isolated consumer containing the actual installed package.
 * @param {Function} buildSync - The development esbuild implementation.
 * @returns {void} Nothing; failed graph or runtime checks throw.
 */
export function verifyHighlighterGraph(consumerRoot, buildSync) {
    const require = createRequire(join(consumerRoot, 'package.json'));
    const manifest = require('@diplodoc/transform/package.json');
    const external = Object.keys(manifest.dependencies).filter((name) => name !== 'highlight.js');
    const graphRoot = join(consumerRoot, 'highlighter-graph');
    mkdirSync(graphRoot);
    const base = {
        absWorkingDir: consumerRoot,
        bundle: true,
        metafile: true,
        platform: 'node',
        external,
        logLevel: 'silent',
    };
    for (const entry of [
        '@diplodoc/transform',
        '@diplodoc/transform/parser',
        '@diplodoc/transform/configuration',
        '@diplodoc/transform/highlighter',
    ]) {
        const result = buildSync({
            ...base,
            stdin: {
                contents: `import * as api from '${entry}'; globalThis.api = api;`,
                resolveDir: consumerRoot,
            },
            write: false,
        });
        assert.equal(
            Object.keys(result.metafile.inputs).some((path) =>
                /node_modules[/\\]highlight\.js[/\\]/.test(path),
            ),
            false,
        );
        assert.doesNotMatch(
            result.outputFiles[0].text,
            /(?:require|import)\(["']highlight\.js(?:\/|["'])/,
        );
    }
    const legacy = buildSync({
        ...base,
        stdin: {
            contents:
                "import {createLegacyHighlighter} from '@diplodoc/transform/highlighter/legacy'; globalThis.api = createLegacyHighlighter;",
            resolveDir: consumerRoot,
        },
        write: false,
    });
    assert.ok(
        Object.keys(legacy.metafile.inputs).some((path) =>
            /node_modules[/\\]highlight\.js[/\\]/.test(path),
        ),
    );

    const entry = join(graphRoot, 'lazy.mjs');
    writeFileSync(
        entry,
        `
import assert from 'node:assert/strict';
import transform from '@diplodoc/transform';
import {createHighlightJsHighlighter} from '@diplodoc/transform/highlighter';
const [module, language] = await Promise.all([import('highlight.js/lib/core'), import('highlight.js/lib/languages/javascript')]);
const highlighter = createHighlightJsHighlighter(module, {languages: {javascript: language.default}, allowedLanguages: ['js']});
const result = transform('~~~js\\nconst x = 1;\\n~~~', {highlighter});
assert.equal(typeof result.then, 'undefined');
assert.match(result.result.html, /hljs-keyword/);
console.log('Caller-owned lazy highlighter bundle passed');
`,
    );
    const outdir = join(graphRoot, 'out');
    const result = buildSync({
        ...base,
        entryPoints: [entry],
        outdir,
        format: 'esm',
        splitting: true,
        outExtension: {'.js': '.mjs'},
        banner: {
            js: "import {createRequire as __createRequire} from 'node:module'; const require = __createRequire(import.meta.url);",
        },
    });
    const outputEntries = Object.entries(result.metafile.outputs);
    const main = outputEntries.find(
        ([, value]) => value.entryPoint === 'highlighter-graph/lazy.mjs',
    );
    assert.ok(main);
    assert.equal(
        Object.keys(main[1].inputs).some((path) =>
            /node_modules[/\\]highlight\.js[/\\]/.test(path),
        ),
        false,
    );
    assert.equal(main[1].imports.filter((item) => item.kind === 'dynamic-import').length, 2);
    assert.ok(
        outputEntries.some(([, value]) =>
            Object.keys(value.inputs).some((path) => /highlight\.js[/\\]lib[/\\]core/.test(path)),
        ),
    );
    writeFileSync(join(graphRoot, 'metafile.json'), JSON.stringify(result.metafile, null, 2));
    assert.doesNotMatch(
        readFileSync(join(consumerRoot, main[0]), 'utf8'),
        /Could not find the language/,
    );
    execFileSync(process.execPath, [join(consumerRoot, main[0])], {
        cwd: consumerRoot,
        stdio: 'inherit',
    });
}
