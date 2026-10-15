import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const result = await build({
    absWorkingDir: projectRoot,
    entryPoints: ['src/transform/svgo.ts'],
    outfile: 'lib/svgo.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    metafile: true,
    legalComments: 'eof',
});

// Each input belongs to its nearest named package, even under nested node_modules.
const dependencyOf = (input) => {
    let directory = dirname(resolve(projectRoot, input));
    while (directory !== dirname(directory)) {
        const manifest = join(directory, 'package.json');
        if (existsSync(manifest)) {
            const {name, version} = JSON.parse(readFileSync(manifest, 'utf8'));
            if (name) {
                return {directory, key: `${name}@${version}`};
            }
        }
        directory = dirname(directory);
    }
    throw new Error(`Cannot identify bundled dependency for ${input}`);
};

// Preserve the licenses of every dependency included in the generated module.
const notices = new Map();
for (const input of Object.keys(result.metafile.inputs)) {
    if (!input.includes('node_modules/')) {
        continue;
    }
    const {directory, key} = dependencyOf(input);
    if (notices.has(key)) {
        continue;
    }
    const licenses = readdirSync(directory)
        .filter((file) => /^(?:licen[sc]e|copying|notice)(?:[._-].*)?$/i.test(file))
        .sort();
    if (licenses.length > 0) {
        notices.set(
            key,
            licenses.map((file) => readFileSync(join(directory, file), 'utf8')).join('\n'),
        );
        continue;
    }
    // Some published packages (for example boolbase 1.0.0) provide only manifest notices.
    const {license, author, contributors, repository} = JSON.parse(
        readFileSync(join(directory, 'package.json'), 'utf8'),
    );
    if (!license) {
        throw new Error(`Missing license information for bundled dependency ${key}`);
    }
    notices.set(key, JSON.stringify({license, author, contributors, repository}, null, 2));
}
const licenseText = [...notices.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, text]) => `${name}\n${text.trim()}\n`)
    .join('\n');
writeFileSync(join(projectRoot, 'lib/svgo.LICENSES.txt'), licenseText);
