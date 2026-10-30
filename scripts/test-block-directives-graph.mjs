import assert from 'node:assert/strict';

/**
 * Check the real installed browser graph of the pure block-directive migrator.
 * @param {string} consumerRoot - Isolated installed-package consumer.
 * @param {Function} buildSync - Existing development esbuild implementation.
 * @returns {void} Forbidden dependencies fail the package gate.
 */
export function verifyBlockDirectivesGraph(consumerRoot, buildSync) {
    const result = buildSync({
        stdin: {
            contents:
                "import {migrateBlockDirectives} from '@diplodoc/transform/migrations/block-directives'; globalThis.migrate = migrateBlockDirectives;",
            resolveDir: consumerRoot,
        },
        bundle: true,
        platform: 'browser',
        format: 'esm',
        metafile: true,
        write: false,
        logLevel: 'silent',
    });
    assert(Object.keys(result.metafile.inputs).length > 0);
    assert(
        Object.values(result.metafile.outputs).every((output) => output.imports.length === 0),
        'The migration must bundle without external or Node builtin imports',
    );
    assert(
        Object.keys(result.metafile.inputs).every(
            (path) =>
                !/(?:utilsFS|index-node|highlight\.js|[/\\]highlighter|[/\\]liquid[/\\]|plugins[/\\]includes|preprocessors[/\\]included[/\\]index|[/\\](?:log|deprecation)\.js$|[/\\]lib[/\\]index\.js$)/.test(
                    path,
                ),
        ),
        'The migration must exclude document execution, file loading and runtime reporting',
    );
}
