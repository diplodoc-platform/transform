import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    realpathSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import {cpus, freemem, loadavg, platform, release, tmpdir, totalmem} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';

import {cases} from './fixtures.mjs';

const print = (message) => process.stdout.write(message + '\n');
const combinedStatus = (checks) => {
    if (checks.some((check) => check.status === 'FAIL')) {
        return 'FAIL';
    }
    if (checks.some((check) => check.status === 'INCONCLUSIVE')) {
        return 'INCONCLUSIVE';
    }
    return 'PASS';
};

const {values: args} = parseArgs({
    options: {
        baseline: {type: 'string'},
        candidate: {type: 'string'},
        dependencies: {type: 'string'},
        cases: {type: 'string'},
        out: {type: 'string'},
        sizes: {type: 'string'},
        rounds: {type: 'string', default: '3'},
        repetitions: {type: 'string', default: '5'},
        warmups: {type: 'string', default: '2'},
        timeout: {type: 'string', default: '30000'},
        'heap-mb': {type: 'string', default: '512'},
        'max-scaling': {type: 'string', default: '3.0'},
        'max-slowdown': {type: 'string', default: '1.5'},
        'max-noise': {type: 'string', default: '0.2'},
        'min-ms': {type: 'string', default: '5'},
        'allow-output-change': {type: 'string'},
        list: {type: 'boolean'},
        help: {type: 'boolean'},
    },
});
if (args.help || args.list || !args.baseline || !args.candidate) {
    print(
        'Usage: node scripts/performance/run.mjs --baseline PACKAGE --candidate PACKAGE [--cases names] [--out DIR]\nPACKAGE: installed directory, or trusted local .tgz with --dependencies existing/node_modules.\nSee docs/performance.md for thresholds, artifact preparation, and limitations.\nCases: ' +
            Object.keys(cases).join(', '),
    );
    await new Promise((done) => process.stdout.write('', done));
    process.exit(args.help || args.list ? 0 : 2);
}
const number = (key, minimum = 1) => {
    const value = Number(args[key]);
    if (!Number.isFinite(value) || value < minimum) {
        throw new Error(`Invalid --${key}`);
    }
    return value;
};
const config = {
    rounds: number('rounds'),
    repetitions: number('repetitions'),
    warmups: number('warmups', 0),
    timeout: number('timeout'),
    heapMb: number('heap-mb'),
    maxScaling: number('max-scaling'),
    maxSlowdown: number('max-slowdown'),
    maxNoise: number('max-noise', 0),
    minMs: number('min-ms', 0),
};
for (const key of ['rounds', 'repetitions', 'warmups', 'timeout', 'heapMb']) {
    if (!Number.isInteger(config[key])) {
        throw new Error(`${key} must be an integer`);
    }
}
const selected = args.cases ? args.cases.split(',') : Object.keys(cases);
const allowedChanges = (args['allow-output-change'] || '').split(',').filter(Boolean);
for (const name of [...selected, ...allowedChanges]) {
    if (!cases[name]) {
        throw new Error(`Unknown case ${name}`);
    }
}
const requestedSizes = args.sizes?.split(',').map(Number);
if (
    requestedSizes &&
    (requestedSizes.length !== 2 ||
        !requestedSizes.every((n) => Number.isSafeInteger(n) && n > 0) ||
        requestedSizes[1] !== requestedSizes[0] * 2)
) {
    throw new Error('--sizes must be N,2N');
}
const out = resolve(
    args.out ||
        join(tmpdir(), `transform-performance-${new Date().toISOString().replace(/[:.]/g, '-')}`),
);
if (existsSync(out)) {
    throw new Error(`Output directory already exists: ${out}`);
}
mkdirSync(out, {recursive: true});
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
function hashTree(root, prefix = '') {
    const entries = [];
    for (const name of readdirSync(join(root, prefix)).sort()) {
        const path = join(root, prefix, name);
        const key = join(prefix, name);
        const stat = lstatSync(path);
        if (stat.isDirectory()) {
            entries.push(...hashTree(root, key));
        } else if (stat.isFile()) {
            entries.push({path: key, bytes: stat.size, sha256: sha(readFileSync(path))});
        } else {
            throw new Error(`Runtime trees must contain regular files: ${path}`);
        }
    }
    return entries;
}
function prepare(input, label) {
    const path = realpathSync(resolve(input));
    let root = path;
    let archiveSha256;
    if (lstatSync(path).isFile()) {
        if (!path.endsWith('.tgz') && !path.endsWith('.tar.gz')) {
            throw new Error('Expected local .tgz or .tar.gz');
        }
        if (!args.dependencies) {
            throw new Error('Archive input requires --dependencies existing/node_modules');
        }
        const listing = spawnSync('tar', ['-tzvf', path], {
            encoding: 'utf8',
            maxBuffer: 16 * 1024 * 1024,
        });
        if (
            listing.status !== 0 ||
            listing.stdout.split('\n').some((line) => line && !['d', '-'].includes(line[0]))
        ) {
            throw new Error('Archive listing failed or contains links/special files');
        }
        const names = spawnSync('tar', ['-tzf', path], {
            encoding: 'utf8',
            maxBuffer: 16 * 1024 * 1024,
        });
        if (
            names.status !== 0 ||
            names.stdout
                .split('\n')
                .some(
                    (name) =>
                        name &&
                        (!name.startsWith('package/') ||
                            isAbsolute(name) ||
                            name.split('/').includes('..')),
                )
        ) {
            throw new Error('Archive must have safe npm package/ paths');
        }
        const destination = join(out, label + '-unpacked');
        mkdirSync(destination);
        const extraction = spawnSync('tar', ['-xzf', path, '-C', destination], {encoding: 'utf8'});
        if (extraction.status !== 0) {
            throw new Error('Archive extraction failed');
        }
        root = join(destination, 'package');
        symlinkSync(realpathSync(resolve(args.dependencies)), join(root, 'node_modules'), 'dir');
        archiveSha256 = sha(readFileSync(path));
    }
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    if (manifest.name !== '@diplodoc/transform' || !manifest.version) {
        throw new Error(`Not a Transform package: ${root}`);
    }
    const entries = [{path: 'package.json', sha256: sha(readFileSync(join(root, 'package.json')))}];
    for (const directory of ['lib', 'public', 'api', 'dist']) {
        if (existsSync(join(root, directory))) {
            entries.push(...hashTree(root, directory));
        }
    }
    if (
        !entries.some((entry) => entry.path.startsWith('lib/')) ||
        !existsSync(join(root, manifest.main))
    ) {
        throw new Error(`Build package before measuring: ${root}`);
    }
    const lockfiles = [];
    let parent = root;
    while (parent !== dirname(parent)) {
        const lockfile = join(parent, 'package-lock.json');
        if (existsSync(lockfile)) {
            lockfiles.push({path: lockfile, sha256: sha(readFileSync(lockfile))});
        }
        parent = dirname(parent);
    }
    writeJson(join(out, label + '-manifest.json'), entries);
    return {
        input: path,
        root,
        name: manifest.name,
        version: manifest.version,
        archiveSha256,
        lockfiles,
        treeSha256: sha(JSON.stringify(entries)),
        manifestFile: label + '-manifest.json',
    };
}
const artifacts = {
    baseline: prepare(args.baseline, 'baseline'),
    candidate: prepare(args.candidate, 'candidate'),
};
const started = new Date().toISOString();
const hardware = {
    node: process.version,
    executable: process.execPath,
    nodeSha256: sha(readFileSync(process.execPath)),
    versions: process.versions,
    platform: platform(),
    release: release(),
    architecture: process.arch,
    cpu: cpus(),
    totalMemory: totalmem(),
    freeMemory: freemem(),
    loadAverage: loadavg(),
};
print(`Measuring ${selected.length} cases, ${config.rounds} paired rounds; output ${out}`);
if (hardware.loadAverage[0] > Math.max(2, hardware.cpu.length / 2)) {
    print(
        'WARNING: machine load is high; repeat final acceptance sequentially on an idle machine.',
    );
}
const suiteManifest = ['run.mjs', 'worker.mjs', 'fixtures.mjs'].map((name) => ({
    name,
    sha256: sha(readFileSync(new URL(name, import.meta.url))),
}));
const report = {
    suiteManifest,
    schemaVersion: 1,
    started,
    hardware,
    artifacts,
    config,
    allowedOutputChanges: allowedChanges,
    samples: [],
    checks: [],
    status: 'RUNNING',
};
const checkpoint = () => writeJson(join(out, 'report.json'), report);
const worker = fileURLToPath(new URL('./worker.mjs', import.meta.url));
const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return (
        (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) /
        2
    );
};
function summary(samples) {
    const values = samples.flatMap((sample) => sample.durationsMs);
    const mid = median(values);
    const mad = median(values.map((value) => Math.abs(value - mid)));
    const sorted = [...values].sort((a, b) => a - b);
    const roundMedians = samples.map((sample) => median(sample.durationsMs));
    return {
        medianMs: mid,
        madMs: mad,
        relativeMad: mad / mid,
        p10Ms: sorted[Math.floor((sorted.length - 1) * 0.1)],
        p90Ms: sorted[Math.ceil((sorted.length - 1) * 0.9)],
        roundMedians,
        lowMs: Math.max(0, Math.min(...roundMedians) - mad * 2),
        highMs: Math.max(...roundMedians) + mad * 2,
    };
}
function compare(label, numerator, denominator, threshold) {
    const ratio = numerator.medianMs / denominator.medianMs;
    const lowRatio = numerator.lowMs / denominator.highMs;
    const highRatio = denominator.lowMs > 0 ? numerator.highMs / denominator.lowMs : null;
    const noisy =
        numerator.relativeMad > config.maxNoise ||
        denominator.relativeMad > config.maxNoise ||
        denominator.medianMs < config.minMs;
    const enough = config.rounds >= 3 && config.repetitions >= 3;
    let status = 'INCONCLUSIVE';
    if (enough && !noisy) {
        if (lowRatio > threshold) {
            status = 'FAIL';
        } else if (highRatio !== null && highRatio <= threshold) {
            status = 'PASS';
        }
    }
    return {label, status, ratio, lowRatio, highRatio, threshold, noisy, enoughSamples: enough};
}
for (const name of selected) {
    const fixture = cases[name];
    const sizes = requestedSizes || fixture.sizes;
    const directory = join(out, name);
    mkdirSync(directory);
    for (const [path, content] of Object.entries(fixture.files || {})) {
        writeFileSync(join(directory, path), content);
    }
    for (const size of sizes) {
        writeFileSync(join(directory, `input-${size}.md`), fixture.source(size));
    }
    for (let round = 0; round < config.rounds; round++) {
        // Alternate both role and size order to reduce systematic warm-machine bias.
        const roles = round % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate'];
        const order = round % 2 ? [...sizes].reverse() : sizes;
        for (const size of order) {
            for (const role of roles) {
                const stem = `${role}-${size}-${round}`;
                const job = {
                    case: name,
                    size,
                    package: artifacts[role].root,
                    files: directory,
                    input: join(directory, `input-${size}.md`),
                    output: join(directory, stem + '-output.json'),
                    result: join(directory, stem + '-result.json'),
                    warmups: config.warmups,
                    repetitions: config.repetitions,
                };
                const jobPath = join(directory, stem + '-job.json');
                writeJson(jobPath, job);
                const child = spawnSync(
                    process.execPath,
                    [`--max-old-space-size=${config.heapMb}`, worker, jobPath],
                    {
                        timeout: config.timeout,
                        maxBuffer: 1024 * 1024,
                        encoding: 'utf8',
                        env: {PATH: process.env.PATH, LANG: 'C.UTF-8', TZ: 'UTC'},
                    },
                );
                writeFileSync(join(directory, stem + '-stderr.log'), child.stderr || '');
                writeFileSync(join(directory, stem + '-stdout.log'), child.stdout || '');
                if (child.status !== 0 || child.error) {
                    report.samples.push({
                        case: name,
                        size,
                        round,
                        role,
                        status: 'ERROR',
                        inputFile: relative(out, job.input),
                        outputFile: existsSync(job.output) ? relative(out, job.output) : undefined,
                        exitCode: child.status,
                        signal: child.signal,
                        error: child.error?.message,
                        stderr: relative(out, join(directory, stem + '-stderr.log')),
                    });
                } else {
                    const sample = JSON.parse(readFileSync(job.result, 'utf8'));
                    const runtimeManifest = {modules: sample.modules, packages: sample.packages};
                    writeJson(join(directory, stem + '-runtime.json'), runtimeManifest);
                    delete sample.modules;
                    delete sample.packages;
                    sample.runtimeManifestFile = relative(
                        out,
                        join(directory, stem + '-runtime.json'),
                    );
                    sample.runtimeManifestHash = sha(JSON.stringify(runtimeManifest));
                    report.samples.push({
                        case: name,
                        size,
                        round,
                        role,
                        status: 'OK',
                        inputBytes: Buffer.byteLength(fixture.source(size)),
                        inputHash: sha(fixture.source(size)),
                        ...sample,
                        resultFile: relative(out, job.result),
                        outputFile: relative(out, job.output),
                    });
                }
                checkpoint();
            }
        }
    }
    const samples = report.samples.filter((sample) => sample.case === name);
    if (samples.some((sample) => sample.status !== 'OK')) {
        report.checks.push({
            case: name,
            status: 'FAIL',
            label: 'execution-or-correctness',
            detail: 'See per-child stderr logs; timeout, heap exhaustion, and assertion errors fail the case.',
        });
    } else {
        const stats = {};
        for (const role of ['baseline', 'candidate']) {
            stats[role] = sizes.map((size) =>
                summary(samples.filter((sample) => sample.role === role && sample.size === size)),
            );
            report.checks.push({
                case: name,
                role,
                ...compare('scaling', stats[role][1], stats[role][0], config.maxScaling),
            });
        }
        sizes.forEach((size, index) => {
            report.checks.push({
                case: name,
                size,
                ...compare(
                    'candidate/baseline',
                    stats.candidate[index],
                    stats.baseline[index],
                    config.maxSlowdown,
                ),
            });
            const byRole = ['baseline', 'candidate'].map(
                (role) =>
                    new Set(
                        samples
                            .filter((sample) => sample.size === size && sample.role === role)
                            .map((sample) => sample.outputHash),
                    ),
            );
            const deterministic = byRole.every((hashes) => hashes.size === 1);
            const matches = deterministic && [...byRole[0]][0] === [...byRole[1]][0];
            let status = 'FAIL';
            if (matches) {
                status = 'PASS';
            } else if (deterministic && allowedChanges.includes(name)) {
                status = 'ACCEPTED_CHANGE';
            }
            report.checks.push({
                case: name,
                size,
                label: 'exact-output',
                status,
                deterministic,
                detail: matches
                    ? 'All repeated baseline and candidate outputs match byte for byte.'
                    : 'Outputs differ; inspect saved outputs. Allowlist waives only cross-artifact comparison, never nondeterminism or assertions.',
            });
        });
        writeJson(join(directory, 'summary.json'), {sizes, stats});
    }
    const checks = report.checks.filter((check) => check.case === name);
    print(`${name}: ${combinedStatus(checks)}`);
    checkpoint();
}
report.status = combinedStatus(report.checks);
report.finished = new Date().toISOString();
report.finalLoadAverage = loadavg();
checkpoint();
print(`${report.status}: ${join(out, 'report.json')}`);
process.exitCode = {FAIL: 1, INCONCLUSIVE: 2, PASS: 0}[report.status];
