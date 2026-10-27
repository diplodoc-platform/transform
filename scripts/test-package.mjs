import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {
    copyFileSync,
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
    const companions = process.env.TRANSFORM_PACKAGE_COMPANIONS
        ? JSON.parse(readFileSync(process.env.TRANSFORM_PACKAGE_COMPANIONS, 'utf8'))
        : {};
    writeFileSync(
        join(consumerRoot, 'package.json'),
        JSON.stringify({
            private: true,
            dependencies: {
                '@diplodoc/transform': `file:${join(temporaryRoot, packed[0].filename)}`,
                '@types/node': manifest.devDependencies['@types/node'],
                ...companions,
            },
            overrides: Object.fromEntries(
                Object.keys(companions).map((name) => [name, `$${name}`]),
            ),
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
    copyFileSync(
        join(projectRoot, 'scripts/package-consumer.mjs'),
        join(consumerRoot, 'consumer.mjs'),
    );
    execFileSync(process.execPath, [join(consumerRoot, 'consumer.mjs')], {
        cwd: consumerRoot,
        stdio: 'inherit',
    });
    // Static imports are evaluated in the real installed consumer, independent of source self-resolution.
    writeFileSync(
        join(consumerRoot, 'static-consumer.mjs'),
        `
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import transform, {transform as namedTransform} from '@diplodoc/transform';
import parser from '@diplodoc/transform/parser';
import images, {replaceSvgContent} from '@diplodoc/transform/plugins/images';
import log, {getLogger} from '@diplodoc/transform/log';
import {createDeprecationReporter} from '@diplodoc/transform/deprecation';
import {getFileTokens} from '@diplodoc/transform/utils/fs';
import {definePlugin, defineTransformOptions} from '@diplodoc/transform/configuration';
const require = createRequire(import.meta.url);
assert.equal(transform, namedTransform);
assert.equal(transform, require('@diplodoc/transform'));
assert.equal(parser, require('@diplodoc/transform/parser'));
assert.equal(images.replaceSvgContent, replaceSvgContent);
assert.equal(typeof getLogger, 'function');
assert.equal(typeof createDeprecationReporter, 'function');
assert.equal(typeof getFileTokens, 'function');
assert.equal(log, require('@diplodoc/transform/log').default);
assert.equal(typeof definePlugin, 'function');
assert.equal(defineTransformOptions, require('@diplodoc/transform/configuration').defineTransformOptions);
assert.match(transform('Static ESM', defineTransformOptions()).result.html, /Static ESM/);
`,
    );
    execFileSync(process.execPath, [join(consumerRoot, 'static-consumer.mjs')], {
        cwd: consumerRoot,
        stdio: 'inherit',
    });
    const consumerRequire = createRequire(join(consumerRoot, 'package.json'));
    assert.throws(() => consumerRequire.resolve('svgo'), {code: 'MODULE_NOT_FOUND'});
    assert.throws(() => consumerRequire.resolve('highlight.js'), {code: 'MODULE_NOT_FOUND'});

    const installedTransform = consumerRequire('@diplodoc/transform');
    assert.match(installedTransform('```js\nconst x = "<";\n```').result.html, /&lt;/);
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
import init = require('@diplodoc/transform/parser');
const options: transform.Options = {svgMaxEntityCount: 1024};
transform.transform('example', options);
const output: transform.Output = transform('example', options);
void output;
init(options);
images.replaceSvgContent('<svg/>', {width: null, height: null, title: null, svgMaxEntityCount: 1024});
`,
    );
    writeFileSync(
        join(consumerRoot, 'consumer.mts'),
        `
import transform, {transform as named} from '@diplodoc/transform';
import parser from '@diplodoc/transform/parser';
import images from '@diplodoc/transform/plugins/images';
import {type OptionsType} from '@diplodoc/transform/types';
const options: OptionsType = {};
const legacyOptions: transform.Options = options;
named('text', legacyOptions);
parser(options);
images.replaceSvgContent('<svg/>', {width: null, height: null, title: null});
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
                esModuleInterop: false,
                ignoreDeprecations: '6.0',
                module: 'Node16',
                moduleResolution: 'Node16',
                target: 'ES2022',
                types: ['node'],
            },
            files: ['consumer.cts', 'consumer.mts'],
        }),
    );
    const configurationTypes = `
const custom = configuration.definePlugin<{label: string}, {label: string}>({
    id: 'package/typed',
    setup(_md, options, context) {
        options.label.toUpperCase();
        const path: string | undefined = context.path;
        context.deprecations.compatibility('PACKAGE');
        context.generateID();
        void path;
        // @ts-expect-error Source paths are optional in an ordinary transform call.
        const guaranteedPath: string = context.path;
        // @ts-expect-error Shared context is not custom plugin configuration.
        options.log;
        void guaranteedPath;
    },
    collect(input, options) {
        const count: number = options.tokenStream.length;
        return options.label + input + count;
    },
});
const configured = custom({label: 'typed'});
configured.plugin.collect?.('source', {label: 'collector', tokenStream: []});
const settings: configuration.TransformConfiguration = {
    plugins: {preset: 'none', enable: ['notes'], plugins: [configured], options: {notes: undefined}},
};
transform('text', configuration.defineTransformOptions(settings));
const parsedTokens = transform('text', configuration.defineTransformOptions({core: {tokens: true}}));
const tokenName: string = parsedTokens[0].type;
void tokenName;
// @ts-expect-error Builtin IDs are finite.
configuration.defineTransformOptions({plugins: {disable: ['note']}});
// @ts-expect-error Core options are closed.
configuration.defineTransformOptions({core: {allowHTLM: true}});
// @ts-expect-error Builtin settings preserve actual value types.
configuration.defineTransformOptions({plugins: {options: {notes: {notesAutotitle: 'false'}}}});
// @ts-expect-error Custom configuration values are checked.
custom({label: false});
// @ts-expect-error Custom configuration rejects unknown keys.
custom({label: 'typed', unknown: true});
`;
    for (const extension of ['cts', 'mts']) {
        const path = join(consumerRoot, `consumer.${extension}`);
        const importLine =
            extension === 'cts'
                ? "import configuration = require('@diplodoc/transform/configuration');"
                : "import * as configuration from '@diplodoc/transform/configuration';";
        writeFileSync(path, `${readFileSync(path, 'utf8')}\n${importLine}\n${configurationTypes}`);
    }

    const typeEntries = Object.entries(manifest.exports).filter(
        ([, entry]) => typeof entry !== 'string',
    );
    for (const extension of ['cts', 'mts']) {
        const typeImports = typeEntries
            .map(([subpath], index) => {
                const name = `@diplodoc/transform${subpath === '.' ? '' : subpath.slice(1)}`;
                return extension === 'cts'
                    ? `import type API${index} = require('${name}');`
                    : `import type * as API${index} from '${name}';`;
            })
            .join('\n');
        const path = join(consumerRoot, `consumer.${extension}`);
        writeFileSync(path, `${readFileSync(path, 'utf8')}\n${typeImports}\n`);
    }
    for (const module of ['Node16', 'NodeNext', 'Preserve']) {
        const configPath = join(consumerRoot, 'tsconfig.json');
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        config.compilerOptions.module = module;
        config.compilerOptions.moduleResolution = module === 'Preserve' ? 'Bundler' : module;
        // Bundler consumers use ESM; native CJS is checked separately without interop.
        config.files = module === 'Preserve' ? ['consumer.mts'] : ['consumer.cts', 'consumer.mts'];
        writeFileSync(configPath, JSON.stringify(config));
        execFileSync(
            process.execPath,
            [projectRequire.resolve('typescript/lib/tsc.js'), '-p', consumerRoot],
            {stdio: 'inherit'},
        );
    }

    writeFileSync(
        join(consumerRoot, 'with-highlighter.mts'),
        `
import transform from '@diplodoc/transform';
import type hljs from 'highlight.js';
type LanguageFn = Parameters<typeof hljs.registerLanguage>[1];
const language: LanguageFn = () => ({contains: []});
transform('text', {highlightLangs: {custom: language}});
`,
    );
    writeFileSync(
        join(consumerRoot, 'with-highlighter.cjs'),
        `
const assert = require('node:assert/strict');
const transform = require('@diplodoc/transform');
const hljs = require('highlight.js');
let registeredWithActualApi = false;
const language = (api) => {
    registeredWithActualApi = api === hljs;
    return {contains: [{begin: /fixture/, className: 'keyword'}]};
};
const html = transform('~~~custom\\nfixture\\n~~~', {highlightLangs: {custom: language}}).result.html;
assert.equal(registeredWithActualApi, true);
assert.match(html, /hljs-keyword/);
`,
    );
    const withHighlighterConfig = JSON.parse(
        readFileSync(join(consumerRoot, 'tsconfig.json'), 'utf8'),
    );
    withHighlighterConfig.compilerOptions.module = 'NodeNext';
    withHighlighterConfig.compilerOptions.moduleResolution = 'NodeNext';
    withHighlighterConfig.files = ['consumer.cts', 'consumer.mts', 'with-highlighter.mts'];
    writeFileSync(join(consumerRoot, 'tsconfig.json'), JSON.stringify(withHighlighterConfig));
    for (const version of ['10.7.3', '^11.8.0']) {
        execFileSync(
            process.execPath,
            [
                process.env.npm_execpath,
                'install',
                '--ignore-scripts',
                '--no-audit',
                '--no-fund',
                `highlight.js@${version}`,
            ],
            {cwd: consumerRoot, stdio: 'inherit'},
        );
        execFileSync(
            process.execPath,
            [projectRequire.resolve('typescript/lib/tsc.js'), '-p', consumerRoot],
            {stdio: 'inherit'},
        );
        execFileSync(process.execPath, [join(consumerRoot, 'with-highlighter.cjs')], {
            cwd: consumerRoot,
            stdio: 'inherit',
        });
        execFileSync(process.execPath, [join(consumerRoot, 'consumer.mjs')], {
            cwd: consumerRoot,
            stdio: 'inherit',
        });
    }

    // Bundle the installed browser entry points independently: base/yfm-only must
    // retain their split contents rather than silently resolving to the full runtime.
    const {buildSync} = projectRequire('esbuild');
    const {JSDOM} = projectRequire('jsdom');
    for (const variant of ['', '/base', '/yfm-only', '/print']) {
        const result = buildSync({
            stdin: {
                contents: `import '@diplodoc/transform/runtime${variant}';`,
                resolveDir: consumerRoot,
            },
            bundle: true,
            platform: 'browser',
            target: 'es2018',
            write: false,
        });
        const browser = new JSDOM('<main class="yfm"><p>Browser runtime fixture</p></main>', {
            runScripts: 'outside-only',
            url: 'https://example.test',
        });
        browser.window.matchMedia = () => ({
            matches: false,
            addEventListener() {},
            removeEventListener() {},
        });
        browser.window.eval(result.outputFiles[0].text);
        browser.window.close();
        buildSync({
            stdin: {
                contents: `import '@diplodoc/transform/styles${variant}';`,
                resolveDir: consumerRoot,
            },
            bundle: true,
            platform: 'browser',
            outdir: join(consumerRoot, 'browser-styles'),
            write: false,
        });
    }
    const sass = projectRequire('sass');
    const stylesheet = sass.compileString('@use "pkg:@diplodoc/transform/scss/yfm-base.scss";', {
        importers: [new sass.NodePackageImporter(consumerRoot)],
        logger: sass.Logger.silent,
    });
    assert.match(stylesheet.css, /\.yfm/);

    // eslint-disable-next-line no-console
    console.log(
        'The npm tarball renders through native CJS/ESM loading, contains the patched SVG parser and licenses, and compiles CJS/ESM consumers with skipLibCheck disabled.',
    );
} finally {
    if (process.env.TRANSFORM_KEEP_PACKAGE_FIXTURE) {
        process.stdout.write(`Package fixture retained at ${temporaryRoot}\n`);
    } else {
        rmSync(temporaryRoot, {recursive: true, force: true});
    }
}
