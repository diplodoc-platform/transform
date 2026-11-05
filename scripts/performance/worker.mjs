import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';

import {cases} from './fixtures.mjs';

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
if (fixture.migration) {
    const api = load('migrations/' + fixture.migration);
    const name = {
        'block-directives': 'migrateBlockDirectives',
        'image-dimensions': 'migrateImageDimensions',
        'table-alignment': 'migrateTableAlignment',
    }[fixture.migration];
    execute = () => api[name](source);
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
    fixture.verify(output, config.size, source);
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
        outputBytes: Buffer.byteLength(serialized),
        memory: process.memoryUsage(),
        maxRssKiB: process.resourceUsage().maxRSS,
        modules,
        packages: [...packages.values()],
    }),
);
