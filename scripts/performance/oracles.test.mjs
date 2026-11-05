import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {assertOutputOracle, loadRoleOracles} from './oracles.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function setup(run) {
    const root = mkdtempSync(join(tmpdir(), 'transform-role-oracle-'));
    try {
        const old = '{"html":" <p>old</p> "}';
        const current = '{"html":" <p>new</p> "}';
        writeFileSync(join(root, 'old.json'), old);
        writeFileSync(join(root, 'new.json'), current);
        const entry = {
            baseline: {file: 'old.json', sha256: sha(old)},
            candidate: {file: 'new.json', sha256: sha(current)},
        };
        const save = (value = entry, size = '2', name = 'example') => {
            const path = join(root, 'oracles.json');
            writeFileSync(
                path,
                JSON.stringify({schemaVersion: 1, cases: {[name]: {[size]: value}}}),
            );
            return path;
        };
        run({root, old, current, entry, save});
    } finally {
        rmSync(root, {recursive: true, force: true});
    }
}

test('paired role files preserve exact output whitespace and reject a changed result', () => {
    setup(({old, current, save}) => {
        const loaded = loadRoleOracles(save(), {example: {}});
        const pair = loaded.cases.example[2];
        assertOutputOracle(old, pair.baseline);
        assertOutputOracle(current, pair.candidate);
        assert.throws(() => assertOutputOracle(current + '\n', pair.candidate), /does not match/);
        assert.throws(() => assertOutputOracle(old, pair.candidate), /does not match/);
    });
});

test('one-sided, unknown, mistyped-size and wrong-hash contracts are rejected', () => {
    setup(({entry, save}) => {
        assert.throws(
            () => loadRoleOracles(save({baseline: entry.baseline}), {example: {}}),
            /candidate/,
        );
        assert.throws(
            () => loadRoleOracles(save(entry, '2', 'unknown'), {example: {}}),
            /Unknown oracle/,
        );
        assert.throws(
            () => loadRoleOracles(save(entry, '02'), {example: {}}),
            /Invalid oracle size/,
        );
        assert.throws(
            () =>
                loadRoleOracles(
                    save({...entry, candidate: {...entry.candidate, sha256: '0'.repeat(64)}}),
                    {example: {}},
                ),
            /hash mismatch/,
        );
    });
});

test('oracle bytes are rechecked after initial manifest validation', () => {
    setup(({root, save}) => {
        const pair = loadRoleOracles(save(), {example: {}}).cases.example[2];
        writeFileSync(join(root, 'new.json'), 'changed after preparation');
        assert.throws(
            () => assertOutputOracle('changed after preparation', pair.candidate),
            /Oracle changed/,
        );
    });
});
