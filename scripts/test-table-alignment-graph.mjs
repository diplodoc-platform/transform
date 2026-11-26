import assert from 'node:assert/strict';

/**
 * Prove the installed migration graph does not include document execution helpers.
 * @param {string} consumerRoot - Isolated tarball consumer.
 * @param {Function} buildSync - Existing development esbuild implementation.
 * @returns {void} Nothing; a forbidden graph edge throws.
 */
export function verifyTableAlignmentGraph(consumerRoot, buildSync) {
    const result = buildSync({
        stdin: {
            contents:
                "import {migrateTableAlignment} from '@diplodoc/transform/migrations/table-alignment'; globalThis.migrate = migrateTableAlignment;",
            resolveDir: consumerRoot,
        },
        bundle: true,
        platform: 'node',
        metafile: true,
        write: false,
        logLevel: 'silent',
    });
    assert.equal(
        Object.keys(result.metafile.inputs).some((path) =>
            /(?:utilsFS|highlight\.js|[/\\]highlighter|[/\\]liquid[/\\]|plugins[/\\]includes)/.test(
                path,
            ),
        ),
        false,
    );
    assert.equal(
        Object.values(result.metafile.outputs).some((output) =>
            output.imports.some(({path}) => /^(?:node:)?fs(?:\/|$)/.test(path)),
        ),
        false,
    );
}
