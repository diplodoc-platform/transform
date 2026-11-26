import assert from 'node:assert/strict';

/**
 * Verify the installed pure migration graph has no document execution or logging edges.
 * @param {string} consumerRoot - Isolated tarball consumer.
 * @param {Function} buildSync - Existing development esbuild implementation.
 * @returns {void} Nothing; forbidden dependencies throw.
 */
export function verifyImageDimensionsGraph(consumerRoot, buildSync) {
    const result = buildSync({
        stdin: {
            contents:
                "import {migrateImageDimensions} from '@diplodoc/transform/migrations/image-dimensions'; globalThis.migrate = migrateImageDimensions;",
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
            /(?:utilsFS|highlight\.js|[/\\]highlighter|[/\\]liquid[/\\]|plugins[/\\]includes|[/\\](?:log|deprecation)\.js$)/.test(
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
