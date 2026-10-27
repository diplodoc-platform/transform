import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = realpathSync(mkdtempSync(join(tmpdir(), 'diplodoc-svgo-package-')));

try {
    // The build has already applied the patch. Disable hooks to inspect exactly that artifact.
    const packed = JSON.parse(
        execFileSync(
            process.execPath,
            [
                process.env.npm_execpath,
                'pack',
                '--json',
                '--ignore-scripts',
                '--pack-destination',
                temporaryRoot,
            ],
            {
                cwd: projectRoot,
                encoding: 'utf8',
                env: {...process.env, npm_config_cache: join(temporaryRoot, 'cache')},
            },
        ),
    );
    const extractedRoot = join(temporaryRoot, 'extracted');
    mkdirSync(extractedRoot);
    execFileSync('tar', ['-xzf', join(temporaryRoot, packed[0].filename), '-C', extractedRoot]);

    const packageRoot = join(extractedRoot, 'package');
    const require = createRequire(join(packageRoot, 'package.json'));
    const svgoModule = join(packageRoot, 'lib/svgo.js');
    assert.match(readFileSync(join(packageRoot, 'lib/svgo.LICENSES.txt'), 'utf8'), /svgo@4\.1\.0/);
    assert.equal(require.resolve('./lib/svgo.js'), svgoModule);
    assert.equal(existsSync(join(packageRoot, 'node_modules/svgo')), false);
    const esm = await import(pathToFileURL(svgoModule));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" content="${'&#10;'.repeat(800)}"><path d="M0 0h10"/></svg>`;
    const projectRequire = createRequire(import.meta.url);
    const svgoRoot = dirname(dirname(realpathSync(projectRequire.resolve('svgo'))));
    const nativeEsm = await import(pathToFileURL(join(svgoRoot, 'lib/svgo-node.js')));
    const largeSvg = `<svg xmlns="http://www.w3.org/2000/svg" content="${'x'.repeat(1024 * 1024)}&#10;"><path id="line" d="M0 0h10"/></svg>`;

    for (const {optimize} of [
        require('./lib/svgo.js'),
        esm.default,
        projectRequire('svgo'),
        nativeEsm,
    ]) {
        assert.match(optimize(largeSvg, {plugins: []}).data, /<path id="line"/);
        assert.throws(() => optimize(svg), /Parsed entity count exceeds max entity count/);
        assert.match(optimize(svg, {maxEntityCount: 1024, multipass: true}).data, /<svg/);
        assert.throws(() => optimize(svg), /Parsed entity count exceeds max entity count/);
        assert.throws(
            () => optimize(svg, {maxEntityCount: 1}),
            /Parsed entity count exceeds max entity count/,
        );
    }

    const consumerRoot = join(temporaryRoot, 'consumer');
    mkdirSync(consumerRoot);
    const manifest = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    const typeDependencies = Object.fromEntries(
        Object.entries(manifest.devDependencies).filter(([name]) => name.startsWith('@types/')),
    );
    writeFileSync(
        join(consumerRoot, 'package.json'),
        JSON.stringify({
            private: true,
            dependencies: {
                '@diplodoc/transform': `file:${join(temporaryRoot, packed[0].filename)}`,
                'highlight.js': '^11.8.0',
                ...typeDependencies,
            },
        }),
    );
    execFileSync(
        process.execPath,
        [process.env.npm_execpath, 'install', '--ignore-scripts', '--no-audit', '--no-fund'],
        {
            cwd: consumerRoot,
            stdio: 'inherit',
        },
    );
    const consumerRequire = createRequire(join(consumerRoot, 'package.json'));
    assert.throws(() => consumerRequire.resolve('svgo'), {code: 'MODULE_NOT_FOUND'});

    const installedTransform = consumerRequire('@diplodoc/transform');
    const installedEsm = await import(
        pathToFileURL(consumerRequire.resolve('@diplodoc/transform'))
    );
    assert.equal(installedEsm.default, installedTransform);
    const installedParserRequire = createRequire(consumerRequire.resolve('@diplodoc/transform'));
    assert.equal(installedParserRequire('markdown-it/package.json').version, '15.0.3');

    for (const transform of [installedTransform, installedEsm.default]) {
        assert.equal(
            transform('a\nb\n: definition').result.html,
            '<p>a<br />\nb<br />\n: definition</p>\n',
        );
        assert.equal(
            transform('example.com', {plugins: [], linkify: true}).result.html,
            '<p><a href="http://example.com">example.com</a></p>\n',
        );
        assert.match(
            transform(
                '{% list tabs %}\n\n- First\n\n  Content\n\n- Second\n\n  More\n\n{% endlist %}',
            ).result.html,
            /role="tabpanel"/,
        );
    }
    writeFileSync(
        join(consumerRoot, 'consumer.cts'),
        `
import transform = require('@diplodoc/transform');
import images = require('@diplodoc/transform/lib/plugins/images');
import init = require('@diplodoc/transform/lib/md');
const options: transform.Options = {svgMaxEntityCount: 1024};
transform('example', options);
init(options);
images.replaceSvgContent('<svg/>', {width: null, height: null, title: null, svgMaxEntityCount: 1024});
`,
    );
    writeFileSync(
        join(consumerRoot, 'consumer.mts'),
        `
import transform from '@diplodoc/transform';
import {getFileTokens} from '@diplodoc/transform/lib/utilsFS.js';
const tokens = transform('example', {tokens: true});
const tokenType: string = tokens[0].type;
void tokenType;
void getFileTokens;
`,
    );
    writeFileSync(
        join(consumerRoot, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: {
                strict: true,
                skipLibCheck: false,
                noEmit: true,
                esModuleInterop: true,
                module: 'Node16',
                moduleResolution: 'Node16',
                target: 'ES2022',
                types: ['node'],
            },
            files: ['consumer.cts', 'consumer.mts'],
        }),
    );
    execFileSync(
        process.execPath,
        [projectRequire.resolve('typescript/lib/tsc.js'), '-p', consumerRoot],
        {stdio: 'inherit'},
    );

    // eslint-disable-next-line no-console
    console.log(
        'The npm tarball renders through native CJS/ESM loading, contains the patched SVG parser and licenses, and compiles CJS/ESM consumers with skipLibCheck disabled.',
    );
} finally {
    rmSync(temporaryRoot, {recursive: true, force: true});
}
