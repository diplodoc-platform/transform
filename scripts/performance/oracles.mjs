import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;

/**
 * Load explicitly paired, hash-checked local output oracles without recording them.
 * @param {string | undefined} file - Local manifest path.
 * @param {object} fixtures - Known fixture registry.
 * @returns {object | undefined} Validated exact role contracts and manifest identity.
 */
export function loadRoleOracles(file, fixtures) {
    if (!file) return undefined;
    const path = resolve(file);
    const bytes = readFileSync(path);
    const manifest = JSON.parse(bytes);
    if (manifest.schemaVersion !== 1 || !manifest.cases || Array.isArray(manifest.cases)) {
        throw new Error('Expected role-oracle schemaVersion 1 and cases object');
    }
    const cases = {};
    for (const [name, sizes] of Object.entries(manifest.cases)) {
        if (!Object.hasOwn(fixtures, name)) throw new Error(`Unknown oracle case ${name}`);
        cases[name] = {};
        for (const [size, entry] of Object.entries(sizes)) {
            if (
                !Number.isSafeInteger(Number(size)) ||
                Number(size) <= 0 ||
                String(Number(size)) !== size
            ) {
                throw new Error(`Invalid oracle size ${size}`);
            }
            const pair = {};
            for (const role of ['baseline', 'candidate']) {
                const expected = entry[role];
                if (
                    !expected ||
                    typeof expected.file !== 'string' ||
                    !hashPattern.test(expected.sha256)
                ) {
                    throw new Error(`Oracle requires ${name}/${size}/${role} file and SHA-256`);
                }
                const output = resolve(dirname(path), expected.file);
                if (!lstatSync(output).isFile() || sha(readFileSync(output)) !== expected.sha256) {
                    throw new Error(`Oracle file/hash mismatch ${output}`);
                }
                pair[role] = {path: output, sha256: expected.sha256};
            }
            if (entry.inputSha256 !== undefined) {
                if (!hashPattern.test(entry.inputSha256))
                    throw new Error('Invalid oracle input SHA-256');
                pair.inputSha256 = entry.inputSha256;
            }
            cases[name][size] = pair;
        }
    }
    return {manifest: path, manifestSha256: sha(bytes), cases};
}

/**
 * Recheck bytes in the child and compare the complete serialized output exactly.
 * @param {string} serialized - Complete worker JSON bytes.
 * @param {object | undefined} expected - Reviewed file path and SHA-256.
 * @returns {void} Throws on changed oracle bytes or an output mismatch.
 */
export function assertOutputOracle(serialized, expected) {
    if (!expected) return;
    const bytes = readFileSync(expected.path);
    if (sha(bytes) !== expected.sha256) throw new Error(`Oracle changed: ${expected.path}`);
    if (!bytes.equals(Buffer.from(serialized))) {
        throw new Error(
            `Output does not match oracle ${expected.path}; actual SHA-256 ${sha(serialized)}`,
        );
    }
}
