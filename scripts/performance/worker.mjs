import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';

import {cases} from './fixtures.mjs';
import {assertOutputOracle} from './oracles.mjs';

const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const fixture = cases[config.case];
const source = readFileSync(config.input, 'utf8');
const requireAt = createRequire(join(config.package, 'package.json'));
const manifest = requireAt('./package.json');
// Resolve through the package's public export map, including self-reference.
const load = (entry) => requireAt(manifest.name + (entry ? '/' + entry : ''));
const logger = load('log').log;
let generatedIDs = 0;
let execute;
if (fixture.batchRoots) {
    const transform = load('');
    const documents = JSON.parse(source);
    execute = () => {
        const counts = [];
        let first;
        for (const document of documents) {
            const output = transform(document.source, {plugins: [], path: document.path});
            first ??= output;
            counts.push(output.logs.warn.length);
        }
        return {
            html: first.result.html,
            atReturnWarnCounts: counts,
            retainedFirstWarn: [...first.logs.warn],
            globalWarn: [...logger.get().warn],
        };
    };
} else if (fixture.document) {
    const parser = load('parser');
    execute = () => {
        const md = parser({disableLiquid: true, generateID: () => `performance-${++generatedIDs}`});
        const document = md.parseDocument(source);
        const html = md.compileDocument(document);
        return {
            html,
            tokens: document.tokens,
            env: {
                meta: document.env.meta,
                headings: document.env.headings,
                title: document.env.title,
                assets: document.env.assets,
            },
        };
    };
} else if (fixture.migration) {
    const api = load('migrations/' + fixture.migration);
    const name = {
        'block-directives': 'migrateBlockDirectives',
        'image-dimensions': 'migrateImageDimensions',
        'table-alignment': 'migrateTableAlignment',
    }[fixture.migration];
    execute = () => api[name](source, fixture.migrationOptions);
} else if (fixture.sanitize) {
    const api = load('sanitize');
    execute = () => ({html: api.sanitize(source)});
} else {
    const transform = fixture.browser
        ? (await import(pathToFileURL(join(config.package, 'dist/browser/standard.mjs')))).transform
        : load('');
    execute = () => ({
        html: transform(source, {
            allowHTML: true,
            ...(fixture.browser ? fixture.browserOptions : {}),
            ...(fixture.includes ? {plugins: [load('plugins/includes')]} : {}),
            ...(fixture.browser
                ? {}
                : {
                      disableLiquid: true,
                      path: join(config.files, 'document.md'),
                      root: config.files,
                  }),
            generateID: () => `performance-${++generatedIDs}`,
            log: {info() {}, warn() {}, error() {}},
        }).result.html,
    });
}
const run = () => {
    generatedIDs = 0;
    logger.clear();
    return execute();
};
const durations = [];
for (let i = 0; i < config.warmups; i++) {
    run();
}
let output;
for (let i = 0; i < config.repetitions; i++) {
    const start = performance.now();
    output = run();
    durations.push(performance.now() - start);
    // Assertions are outside the measured region; every measured output is checked.
    const serialized = JSON.stringify(output, null, 2);
    writeFileSync(config.output, serialized);
    fixture.verify(output, config.size, source, {hasRoleOracle: Boolean(config.oracle)});
    assertOutputOracle(serialized, config.oracle);
    const digest = createHash('sha256').update(serialized).digest('hex');
    if (i === 0) {
        config.outputHash = digest;
    } else if (digest !== config.outputHash) {
        throw new Error('Nondeterministic output within one child');
    }
}
const serialized = JSON.stringify(output, null, 2);
writeFileSync(config.output, serialized);
const modules = Object.keys(requireAt.cache)
    .sort()
    .map((path) => ({path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex')}));
const packages = new Map();
for (const module of modules) {
    let directory = dirname(module.path);
    while (directory !== dirname(directory)) {
        const file = join(directory, 'package.json');
        if (existsSync(file)) {
            const bytes = readFileSync(file);
            const metadata = JSON.parse(bytes);
            if (metadata.name && metadata.version) {
                packages.set(directory, {
                    root: directory,
                    name: metadata.name,
                    version: metadata.version,
                    sha256: createHash('sha256').update(bytes).digest('hex'),
                });
                break;
            }
        }
        directory = dirname(directory);
    }
}
writeFileSync(
    config.result,
    JSON.stringify({
        durationsMs: durations,
        outputHash: config.outputHash,
        expectedOutputSha256: config.oracle?.sha256,
        roleOracleMatched: Boolean(config.oracle),
        outputBytes: Buffer.byteLength(serialized),
        memory: process.memoryUsage(),
        maxRssKiB: process.resourceUsage().maxRSS,
        modules,
        packages: [...packages.values()],
    }),
);
